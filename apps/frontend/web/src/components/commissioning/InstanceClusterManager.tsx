import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Trash2,
  Users,
  Building,
  Store,
  User,
  Settings2,
  Loader2,
  Zap,
  Package,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Entity {
  id: string;
  name: string;
  code: string | null;
}

interface Driver {
  id: string;
  code: string;
  name: string;
}

interface ValuePackage {
  id: string;
  name: string;
  code: string;
}

interface ClusterMember {
  id: string;
  entityId: string;
  entityType: string;
}

interface InstanceCluster {
  id: string;
  name: string;
  entityType: 'RS' | 'PDV' | 'RISORSA';
  activeDriverIds: string[];
  clusterConfig: Record<string, any>;
  valuePackageIds: string[];
  sortOrder: number;
  isActive: boolean;
  members: ClusterMember[];
}

interface InstanceClusterManagerProps {
  instanceId: string;
  availableDriverIds?: string[];
  availableValuePackageIds?: string[];
  primaryLayer?: 'RS' | 'PDV' | 'USER';
  onClustersChange?: () => void;
}

const entityTypeLabels = {
  RS: { label: 'Ragioni Sociali', icon: Building, color: 'bg-blue-100 text-blue-700' },
  PDV: { label: 'Punti Vendita', icon: Store, color: 'bg-green-100 text-green-700' },
  RISORSA: { label: 'Risorse', icon: User, color: 'bg-purple-100 text-purple-700' },
};

export default function InstanceClusterManager({
  instanceId,
  availableDriverIds = [],
  availableValuePackageIds = [],
  primaryLayer = 'USER',
  onClustersChange,
}: InstanceClusterManagerProps) {
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingClusterId, setEditingClusterId] = useState<string | null>(null);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<InstanceCluster | null>(null);
  
  const [newCluster, setNewCluster] = useState({
    name: '',
    entityType: 'RISORSA' as 'RS' | 'PDV' | 'RISORSA',
    activeDriverIds: [] as string[],
    clusterConfig: {} as Record<string, any>,
    valuePackageIds: [] as string[],
    memberIds: [] as string[],
  });

  const { data: instance, isLoading: instanceLoading } = useQuery<{
    id: string;
    clusters: InstanceCluster[];
  }>({
    queryKey: ['/api/commissioning/configurator-instances', instanceId],
    enabled: !!instanceId,
  });

  const { data: entities = [], isLoading: entitiesLoading, refetch: refetchEntities } = useQuery<Entity[]>({
    queryKey: ['/api/commissioning/entities', { type: newCluster.entityType }],
    enabled: createModalOpen || membersModalOpen,
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['/api/commissioning/drivers'],
  });

  const { data: valuePackages = [] } = useQuery<ValuePackage[]>({
    queryKey: ['/api/commissioning/value-packages'],
  });

  const filteredDrivers = availableDriverIds.length > 0
    ? drivers.filter(d => availableDriverIds.includes(d.id))
    : drivers;

  const filteredValuePackages = availableValuePackageIds.length > 0
    ? valuePackages.filter(v => availableValuePackageIds.includes(v.id))
    : valuePackages;

  useEffect(() => {
    if (createModalOpen || membersModalOpen) {
      refetchEntities();
    }
  }, [newCluster.entityType, createModalOpen, membersModalOpen, refetchEntities]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCluster) => {
      return apiRequest(`/api/commissioning/configurator-instances/${instanceId}/clusters`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/configurator-instances', instanceId] });
      setCreateModalOpen(false);
      setNewCluster({
        name: '',
        entityType: 'RISORSA',
        activeDriverIds: [],
        clusterConfig: {},
        valuePackageIds: [],
        memberIds: [],
      });
      toast({ title: 'Cluster creato', description: 'Il cluster è stato creato con successo.' });
      onClustersChange?.();
    },
    onError: (err: any) => {
      toast({ title: 'Errore', description: err.message || 'Impossibile creare il cluster.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ clusterId, data }: { clusterId: string; data: Partial<typeof newCluster> }) => {
      return apiRequest(`/api/commissioning/configurator-instances/${instanceId}/clusters/${clusterId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/configurator-instances', instanceId] });
      setEditingClusterId(null);
      setMembersModalOpen(false);
      setSelectedCluster(null);
      toast({ title: 'Cluster aggiornato', description: 'Il cluster è stato aggiornato con successo.' });
      onClustersChange?.();
    },
    onError: (err: any) => {
      toast({ title: 'Errore', description: err.message || 'Impossibile aggiornare il cluster.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      return apiRequest(`/api/commissioning/configurator-instances/${instanceId}/clusters/${clusterId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/configurator-instances', instanceId] });
      toast({ title: 'Cluster eliminato', description: 'Il cluster è stato eliminato con successo.' });
      onClustersChange?.();
    },
    onError: (err: any) => {
      toast({ title: 'Errore', description: err.message || 'Impossibile eliminare il cluster.', variant: 'destructive' });
    },
  });

  const toggleDriver = (driverId: string) => {
    if (newCluster.activeDriverIds.includes(driverId)) {
      setNewCluster({
        ...newCluster,
        activeDriverIds: newCluster.activeDriverIds.filter(id => id !== driverId),
      });
    } else {
      setNewCluster({
        ...newCluster,
        activeDriverIds: [...newCluster.activeDriverIds, driverId],
      });
    }
  };

  const toggleValuePackage = (packageId: string) => {
    if (newCluster.valuePackageIds.includes(packageId)) {
      setNewCluster({
        ...newCluster,
        valuePackageIds: newCluster.valuePackageIds.filter(id => id !== packageId),
      });
    } else {
      setNewCluster({
        ...newCluster,
        valuePackageIds: [...newCluster.valuePackageIds, packageId],
      });
    }
  };

  const toggleMember = (entityId: string) => {
    if (newCluster.memberIds.includes(entityId)) {
      setNewCluster({
        ...newCluster,
        memberIds: newCluster.memberIds.filter(id => id !== entityId),
      });
    } else {
      setNewCluster({
        ...newCluster,
        memberIds: [...newCluster.memberIds, entityId],
      });
    }
  };

  const handleOpenMembersModal = (cluster: InstanceCluster) => {
    setSelectedCluster(cluster);
    setNewCluster({
      ...newCluster,
      entityType: cluster.entityType,
      memberIds: cluster.members?.map(m => m.entityId) || [],
    });
    setMembersModalOpen(true);
  };

  const handleSaveMembers = () => {
    if (selectedCluster) {
      updateMutation.mutate({
        clusterId: selectedCluster.id,
        data: {
          entityType: selectedCluster.entityType,
          memberIds: newCluster.memberIds,
        },
      });
    }
  };

  const clusters = instance?.clusters || [];

  if (instanceLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cluster dell'Istanza</h3>
          <p className="text-sm text-gray-500">
            Definisci chi partecipa e i valori specifici per ogni cluster
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuovo Cluster
        </Button>
      </div>

      {clusters.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">
              Nessun cluster configurato.<br />
              Crea un cluster per definire chi partecipa alla gara.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {clusters.map((cluster) => {
            const typeInfo = entityTypeLabels[cluster.entityType];
            const Icon = typeInfo?.icon || Users;
            return (
              <AccordionItem
                key={cluster.id}
                value={cluster.id}
                className="border rounded-lg bg-white"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${typeInfo?.color || 'bg-gray-100'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-semibold text-gray-900">{cluster.name}</div>
                      <div className="text-sm text-gray-500">
                        {cluster.members?.length || 0} {typeInfo?.label.toLowerCase() || 'membri'}
                        {cluster.activeDriverIds?.length > 0 && (
                          <> • {cluster.activeDriverIds.length} driver attivi</>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="mr-4">
                      {typeInfo?.label || cluster.entityType}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4" /> Membri
                        </CardTitle>
                        <CardDescription>Chi partecipa a questo cluster</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(cluster.members || []).slice(0, 5).map((member) => (
                            <Badge key={member.id} variant="secondary" className="mr-1">
                              {member.entityId.slice(0, 8)}...
                            </Badge>
                          ))}
                          {(cluster.members?.length || 0) > 5 && (
                            <Badge variant="outline">+{(cluster.members?.length || 0) - 5} altri</Badge>
                          )}
                          {(!cluster.members || cluster.members.length === 0) && (
                            <p className="text-sm text-gray-500">Nessun membro assegnato</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-2"
                          onClick={() => handleOpenMembersModal(cluster)}
                        >
                          <Edit className="h-3 w-3" /> Gestisci Membri
                        </Button>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Settings2 className="h-4 w-4" /> Configurazione
                        </CardTitle>
                        <CardDescription>Valori specifici per questo cluster</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {cluster.activeDriverIds?.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{cluster.activeDriverIds.length} Driver</span>
                            </div>
                          )}
                          {cluster.valuePackageIds?.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{cluster.valuePackageIds.length} Pacchetti</span>
                            </div>
                          )}
                          {(!cluster.activeDriverIds?.length && !cluster.valuePackageIds?.length) && (
                            <p className="text-sm text-gray-500">Configurazione di default</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(cluster.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Elimina Cluster
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Nuovo Cluster</DialogTitle>
            <DialogDescription>
              Crea un cluster per definire chi partecipa e i valori specifici
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-6 p-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Cluster *</Label>
                  <Input
                    placeholder="es. Team Vendite Nord"
                    value={newCluster.name}
                    onChange={(e) => setNewCluster({ ...newCluster, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo Entità *</Label>
                  <Select
                    value={newCluster.entityType}
                    onValueChange={(v: 'RS' | 'PDV' | 'RISORSA') => setNewCluster({ ...newCluster, entityType: v, memberIds: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RS">Ragioni Sociali</SelectItem>
                      <SelectItem value="PDV">Punti Vendita</SelectItem>
                      <SelectItem value="RISORSA">Risorse (Utenti)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Membri del Cluster
                </Label>
                <p className="text-xs text-gray-500">Chi partecipa a questo cluster</p>
                {entitiesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : entities.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nessuna entità trovata per questo tipo
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {entities.map((entity) => (
                      <div
                        key={entity.id}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                          newCluster.memberIds.includes(entity.id) 
                            ? 'bg-windtre-orange/10 border border-windtre-orange' 
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                        onClick={() => toggleMember(entity.id)}
                      >
                        <Checkbox checked={newCluster.memberIds.includes(entity.id)} />
                        <div className="text-sm truncate flex-1">{entity.name}</div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500">{newCluster.memberIds.length} selezionati</p>
              </div>

              {filteredDrivers.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" /> Driver Attivi
                    </Label>
                    <p className="text-xs text-gray-500">Driver da attivare per questo cluster</p>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredDrivers.map((driver) => (
                        <div
                          key={driver.id}
                          className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                            newCluster.activeDriverIds.includes(driver.id) 
                              ? 'border-yellow-500 bg-yellow-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleDriver(driver.id)}
                        >
                          <Checkbox checked={newCluster.activeDriverIds.includes(driver.id)} />
                          <span className="text-sm truncate">{driver.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {filteredValuePackages.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500" /> Pacchetti Valore
                    </Label>
                    <p className="text-xs text-gray-500">Pacchetti con valori specifici per questo cluster</p>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredValuePackages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className={`flex items-center gap-2 p-2 border rounded cursor-pointer ${
                            newCluster.valuePackageIds.includes(pkg.id) 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleValuePackage(pkg.id)}
                        >
                          <Checkbox checked={newCluster.valuePackageIds.includes(pkg.id)} />
                          <span className="text-sm truncate">{pkg.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Annulla</Button>
            <Button
              onClick={() => createMutation.mutate(newCluster)}
              disabled={!newCluster.name || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crea Cluster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={membersModalOpen} onOpenChange={setMembersModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestione Membri - {selectedCluster?.name}</DialogTitle>
            <DialogDescription>
              Seleziona i membri che partecipano a questo cluster
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {entitiesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="grid gap-2 p-1">
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${
                      newCluster.memberIds.includes(entity.id) 
                        ? 'bg-windtre-orange/10 border border-windtre-orange' 
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => toggleMember(entity.id)}
                  >
                    <Checkbox checked={newCluster.memberIds.includes(entity.id)} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{entity.name}</div>
                      {entity.code && <div className="text-xs text-gray-500">{entity.code}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-gray-500">{newCluster.memberIds.length} selezionati</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMembersModalOpen(false)}>
                  <X className="h-4 w-4 mr-1" /> Annulla
                </Button>
                <Button onClick={handleSaveMembers} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-1" /> Salva
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
