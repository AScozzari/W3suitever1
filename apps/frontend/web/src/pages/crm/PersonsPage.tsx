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
import { Label } from '@/components/ui/label';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Building,
  Search,
  MapPin,
  Calendar,
  UserCheck,
  Link as LinkIcon
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  linkedLeadCount?: number;
  linkedDealCount?: number;
  createdAt: string;
}

export default function PersonsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Italia',
    notes: ''
  });

  // Fetch persons
  const { data: persons, isLoading, error } = useQuery<Person[]>({
    queryKey: ['/api/crm/persons'],
    // Fallback to demo data if API not ready
    initialData: [
      {
        id: '1',
        firstName: 'Mario',
        lastName: 'Rossi',
        fullName: 'Mario Rossi',
        email: 'mario.rossi@example.com',
        phone: '+39 340 1234567',
        company: 'ACME Corporation',
        jobTitle: 'CEO',
        address: 'Via Roma 123',
        city: 'Milano',
        province: 'MI',
        postalCode: '20100',
        country: 'Italia',
        notes: 'Cliente VIP',
        linkedLeadCount: 3,
        linkedDealCount: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        firstName: 'Laura',
        lastName: 'Bianchi',
        fullName: 'Laura Bianchi',
        email: 'laura.bianchi@techcorp.it',
        phone: '+39 348 9876543',
        company: 'TechCorp Solutions',
        jobTitle: 'CTO',
        address: null,
        city: 'Roma',
        province: 'RM',
        postalCode: null,
        country: 'Italia',
        notes: null,
        linkedLeadCount: 1,
        linkedDealCount: 2,
        createdAt: new Date().toISOString()
      }
    ]
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('/api/crm/persons', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/persons'] });
      setIsDialogOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        company: '',
        jobTitle: '',
        address: '',
        city: '',
        province: '',
        postalCode: '',
        country: 'Italia',
        notes: ''
      });
      toast({
        title: 'Contatto creato',
        description: 'Il contatto è stato creato con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare il contatto',
        variant: 'destructive',
      });
    }
  });

  // Filter persons
  const filteredPersons = persons?.filter(person => {
    const query = searchQuery.toLowerCase();
    return (
      person.fullName.toLowerCase().includes(query) ||
      person.email?.toLowerCase().includes(query) ||
      person.phone?.toLowerCase().includes(query) ||
      person.company?.toLowerCase().includes(query)
    );
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
        <ErrorState message="Errore nel caricamento dei contatti" />
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="space-y-6" data-testid="crm-persons-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Gestione Contatti
            </h1>
            <p className="text-gray-600 mt-1">
              Identity Graph completo - {filteredPersons?.length || 0} contatti
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                data-testid="button-new-person"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Nuovo Contatto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crea Nuovo Contatto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nome *</Label>
                    <Input
                      id="firstName"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      data-testid="input-firstname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Cognome *</Label>
                    <Input
                      id="lastName"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      data-testid="input-lastname"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Azienda</Label>
                    <Input
                      id="company"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      data-testid="input-company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Ruolo</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      data-testid="input-jobtitle"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Indirizzo</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    data-testid="input-address"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Città</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      data-testid="input-city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provincia</Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      data-testid="input-province"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">CAP</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      data-testid="input-postalcode"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Note</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                    className="bg-gradient-to-r from-blue-500 to-blue-600"
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? 'Salvataggio...' : 'Crea Contatto'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca per nome, email, telefono o azienda..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* Persons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersons?.map((person) => (
            <Card 
              key={person.id} 
              className="hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
              data-testid={`person-card-${person.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <UserCheck className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{person.fullName}</CardTitle>
                      {person.jobTitle && (
                        <p className="text-sm text-gray-600">{person.jobTitle}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {person.company && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building className="h-4 w-4" />
                    <span>{person.company}</span>
                  </div>
                )}
                
                {person.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${person.email}`} className="hover:text-blue-600">
                      {person.email}
                    </a>
                  </div>
                )}
                
                {person.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${person.phone}`} className="hover:text-blue-600">
                      {person.phone}
                    </a>
                  </div>
                )}

                {person.city && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{person.city}{person.province ? ` (${person.province})` : ''}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Creato: {new Date(person.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>

                {/* Identity Graph Links */}
                <div className="flex gap-2 pt-3 border-t">
                  {(person.linkedLeadCount ?? 0) > 0 && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      {person.linkedLeadCount} Lead
                    </Badge>
                  )}
                  {(person.linkedDealCount ?? 0) > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      {person.linkedDealCount} Deal
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredPersons?.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessun contatto trovato
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Prova con criteri di ricerca diversi' : 'Inizia creando il tuo primo contatto'}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crea Primo Contatto
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
