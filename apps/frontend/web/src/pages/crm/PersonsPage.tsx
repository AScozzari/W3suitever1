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
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Search,
  UserCheck,
  Link as LinkIcon
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { crmPersonFormSchema, type CrmPersonFormValidation } from '@/lib/validation/italian-business-validation';

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  emailCanonical: string | null;
  phoneCanonical: string | null;
  linkedLeadCount?: number;
  linkedDealCount?: number;
  createdAt: string;
}

export default function PersonsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form with zodResolver
  const form = useForm<CrmPersonFormValidation>({
    resolver: zodResolver(crmPersonFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      emailCanonical: '',
      phoneCanonical: '',
    }
  });

  // Fetch persons
  const { data: persons, isLoading, error } = useQuery<Person[]>({
    queryKey: ['/api/crm/persons'],
    initialData: [
      {
        id: '1',
        firstName: 'Mario',
        lastName: 'Rossi',
        fullName: 'Mario Rossi',
        emailCanonical: 'mario.rossi@example.com',
        phoneCanonical: '+39 340 1234567',
        linkedLeadCount: 3,
        linkedDealCount: 1,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        firstName: 'Laura',
        lastName: 'Bianchi',
        fullName: 'Laura Bianchi',
        emailCanonical: 'laura.bianchi@techcorp.it',
        phoneCanonical: '+39 348 9876543',
        linkedLeadCount: 1,
        linkedDealCount: 2,
        createdAt: new Date().toISOString()
      }
    ]
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CrmPersonFormValidation) => {
      return await apiRequest('/api/crm/persons', 'POST', {
        ...data,
        tenantId: '00000000-0000-0000-0000-000000000001' // Will be set by backend
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/persons'] });
      toast({
        title: 'Persona creata',
        description: 'La persona è stata aggiunta con successo',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare la persona',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: CrmPersonFormValidation) => {
    createMutation.mutate(data);
  };

  // Filter persons by search
  const filteredPersons = persons?.filter(person => 
    searchQuery === '' || 
    person.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.emailCanonical?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.phoneCanonical?.includes(searchQuery)
  );

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
        <ErrorState message="Errore nel caricamento delle persone" />
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="space-y-6" data-testid="crm-persons">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Gestione Contatti
            </h1>
            <p className="text-gray-600 mt-1">
              Identity Graph - {filteredPersons?.length || 0} persone
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                data-testid="button-new-person"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Nuova Persona
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuova Persona</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    name="emailCanonical"
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
                    name="phoneCanonical"
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
                      {createMutation.isPending ? 'Creazione...' : 'Crea Persona'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca per nome, email o telefono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {/* Persons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersons?.map((person) => (
            <Card 
              key={person.id}
              className="hover:shadow-xl transition-shadow border-2 hover:border-orange-200"
              data-testid={`card-person-${person.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{person.fullName}</CardTitle>
                      <p className="text-sm text-gray-500">
                        {new Date(person.createdAt).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {person.emailCanonical && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700" data-testid={`text-email-${person.id}`}>
                      {person.emailCanonical}
                    </span>
                  </div>
                )}
                {person.phoneCanonical && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700" data-testid={`text-phone-${person.id}`}>
                      {person.phoneCanonical}
                    </span>
                  </div>
                )}

                {/* Identity Graph Links */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <LinkIcon className="h-4 w-4 text-gray-400" />
                  <div className="flex gap-2">
                    {person.linkedLeadCount ? (
                      <Badge variant="outline" className="text-xs">
                        {person.linkedLeadCount} Lead
                      </Badge>
                    ) : null}
                    {person.linkedDealCount ? (
                      <Badge variant="outline" className="text-xs bg-green-50">
                        {person.linkedDealCount} Deal
                      </Badge>
                    ) : null}
                    {!person.linkedLeadCount && !person.linkedDealCount && (
                      <span className="text-xs text-gray-400">Nessun collegamento</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPersons?.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nessuna persona trovata</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery ? 'Prova con una ricerca diversa' : 'Inizia creando la prima persona'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
