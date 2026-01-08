import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Layers, Building, Store, User, Search, Check } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Cluster {
  id: string;
  tenantId: string;
  name: string;
  entityType: 'RS' | 'PDV' | 'RISORSA';
  description: string | null;
  isActive: boolean;
  entityIds?: string[];
  driverIds?: string[];
}

interface ClusterFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: Cluster | null;
}

const formSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio').max(255),
  description: z.string().optional(),
  entityType: z.enum(['RS', 'PDV', 'RISORSA'], { required_error: 'Seleziona un tipo entità' }),
  isActive: z.boolean().default(true),
  entityIds: z.array(z.string()).default([]),
  driverIds: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

const entityTypeInfo: Record<string, { label: string; icon: typeof Building; description: string }> = {
  RS: { label: 'Ragione Sociale', icon: Building, description: 'Raggruppa ragioni sociali' },
  PDV: { label: 'Punto Vendita', icon: Store, description: 'Raggruppa punti vendita' },
  RISORSA: { label: 'Risorsa', icon: User, description: 'Raggruppa risorse/agenti' },
};

export default function ClusterFormModal({ open, onOpenChange, cluster }: ClusterFormModalProps) {
  const { toast } = useToast();
  const [entitySearch, setEntitySearch] = useState('');
  const [driverSearch, setDriverSearch] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: cluster?.name || '',
      description: cluster?.description || '',
      entityType: cluster?.entityType || undefined,
      isActive: cluster?.isActive ?? true,
      entityIds: cluster?.entityIds || [],
      driverIds: cluster?.driverIds || [],
    },
  });

  const entityType = form.watch('entityType');
  const selectedEntityIds = form.watch('entityIds');
  const selectedDriverIds = form.watch('driverIds');

  useEffect(() => {
    if (cluster) {
      form.reset({
        name: cluster.name,
        description: cluster.description || '',
        entityType: cluster.entityType,
        isActive: cluster.isActive,
        entityIds: cluster.entityIds || [],
        driverIds: cluster.driverIds || [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        entityType: undefined,
        isActive: true,
        entityIds: [],
        driverIds: [],
      });
    }
  }, [cluster, form]);

  const { data: entities = [], isLoading: entitiesLoading } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/commissioning/entities', { type: entityType }],
    enabled: open && !!entityType,
  });

  const { data: drivers = [] } = useQuery<{ id: string; name: string; code: string }[]>({
    queryKey: ['/api/wms/drivers'],
    enabled: open,
  });

  const filteredEntities = entities.filter(e => 
    e.name.toLowerCase().includes(entitySearch.toLowerCase())
  );

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.code.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (cluster) {
        return apiRequest(`/api/commissioning/clusters/${cluster.id}`, { 
          method: 'PATCH', 
          body: JSON.stringify(data) 
        });
      }
      return apiRequest('/api/commissioning/clusters', { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/clusters'] });
      toast({ title: cluster ? 'Cluster aggiornato' : 'Cluster creato', description: 'Operazione completata con successo' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile salvare il cluster', variant: 'destructive' });
    },
  });

  const handleSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  const toggleEntity = (entityId: string) => {
    const current = form.getValues('entityIds');
    if (current.includes(entityId)) {
      form.setValue('entityIds', current.filter(id => id !== entityId));
    } else {
      form.setValue('entityIds', [...current, entityId]);
    }
  };

  const toggleDriver = (driverId: string) => {
    const current = form.getValues('driverIds');
    if (current.includes(driverId)) {
      form.setValue('driverIds', current.filter(id => id !== driverId));
    } else {
      form.setValue('driverIds', [...current, driverId]);
    }
  };

  const selectAllEntities = () => {
    form.setValue('entityIds', filteredEntities.map(e => e.id));
  };

  const deselectAllEntities = () => {
    form.setValue('entityIds', []);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-600" />
            {cluster ? 'Modifica Cluster' : 'Nuovo Cluster'}
          </DialogTitle>
          <DialogDescription>Raggruppa entità per applicare regole di commissioning specifiche</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Cluster *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Es: Top PDV Nord Italia" data-testid="input-cluster-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Entità *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!!cluster}>
                      <FormControl>
                        <SelectTrigger data-testid="select-entity-type">
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(entityTypeInfo).map(([key, info]) => {
                          const Icon = info.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {info.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {entityTypeInfo[field.value]?.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Descrizione del cluster..." rows={2} data-testid="input-cluster-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs defaultValue="entities" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entities" className="flex items-center gap-2">
                  {(() => {
                    const EntityIcon = entityTypeInfo[entityType]?.icon;
                    return EntityIcon ? <EntityIcon className="h-4 w-4" /> : null;
                  })()}
                  Entità ({selectedEntityIds.length})
                </TabsTrigger>
                <TabsTrigger value="drivers" className="flex items-center gap-2">
                  Driver ({selectedDriverIds.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entities" className="border rounded-lg p-4 mt-2">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={`Cerca ${entityTypeInfo[entityType]?.label.toLowerCase() || 'entità'}...`}
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-entities"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAllEntities} data-testid="btn-select-all-entities">
                      Seleziona tutti
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={deselectAllEntities} data-testid="btn-deselect-all-entities">
                      Deseleziona
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[200px]">
                  {!entityType ? (
                    <div className="text-center py-8 text-gray-400">
                      Seleziona prima un tipo entità
                    </div>
                  ) : entitiesLoading ? (
                    <div className="text-center py-8 text-gray-400">
                      Caricamento...
                    </div>
                  ) : filteredEntities.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      Nessuna entità trovata
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredEntities.map((entity) => (
                        <div
                          key={entity.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                            selectedEntityIds.includes(entity.id) ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleEntity(entity.id)}
                          data-testid={`entity-${entity.id}`}
                        >
                          <Checkbox 
                            checked={selectedEntityIds.includes(entity.id)} 
                            onCheckedChange={() => toggleEntity(entity.id)}
                          />
                          <span className="text-sm text-gray-700">{entity.name}</span>
                          {selectedEntityIds.includes(entity.id) && (
                            <Check className="h-4 w-4 text-purple-600 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="drivers" className="border rounded-lg p-4 mt-2">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cerca driver..."
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-drivers"
                  />
                </div>

                <ScrollArea className="h-[200px]">
                  {filteredDrivers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      Nessun driver trovato
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredDrivers.map((driver) => (
                        <div
                          key={driver.id}
                          className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                            selectedDriverIds.includes(driver.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleDriver(driver.id)}
                          data-testid={`driver-${driver.id}`}
                        >
                          <Checkbox 
                            checked={selectedDriverIds.includes(driver.id)} 
                            onCheckedChange={() => toggleDriver(driver.id)}
                          />
                          <div>
                            <span className="text-sm text-gray-700">{driver.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{driver.code}</Badge>
                          </div>
                          {selectedDriverIds.includes(driver.id) && (
                            <Check className="h-4 w-4 text-blue-600 ml-auto" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-cluster-active" />
                  </FormControl>
                  <FormLabel className="!mt-0">Cluster Attivo</FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="btn-cancel-cluster">
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                style={{ background: 'hsl(var(--brand-orange))' }}
                data-testid="btn-save-cluster"
              >
                {mutation.isPending ? 'Salvataggio...' : cluster ? 'Salva Modifiche' : 'Crea Cluster'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
