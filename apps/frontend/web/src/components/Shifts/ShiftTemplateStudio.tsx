import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, Clock, Edit2, Trash2, Globe, Store as StoreIcon, 
  ChevronDown, ChevronUp, Save, X, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface TimeSlot {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  requiredStaff?: number;
}

interface ShiftTemplate {
  id: string;
  name: string;
  description?: string;
  scope: 'global' | 'store';
  storeId?: string;
  pattern: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultRequiredStaff: number;
  isActive: boolean;
  timeSlots?: TimeSlot[];
}

interface Store {
  id: string;
  name?: string;
  nome?: string;
  code?: string;
}

interface Props {
  selectedStoreId?: string;
  onTemplateSelect?: (template: ShiftTemplate) => void;
}

export default function ShiftTemplateStudio({ selectedStoreId, onTemplateSelect }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scope: 'global' as 'global' | 'store',
    storeId: '',
    pattern: 'daily',
    defaultStartTime: '09:00',
    defaultEndTime: '18:00',
    defaultRequiredStaff: 1,
  });
  
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { name: 'Turno Standard', startTime: '09:00', endTime: '18:00', requiredStaff: 1 }
  ]);

  const { data: templates = [], isLoading: templatesLoading } = useQuery<ShiftTemplate[]>({
    queryKey: ['/api/hr/shift-templates', selectedStoreId ? { storeId: selectedStoreId } : {}],
  });

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/hr/shift-templates', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({ title: 'Template creato con successo' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Errore nella creazione', variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/hr/shift-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({ title: 'Template aggiornato' });
      resetForm();
    },
    onError: () => {
      toast({ title: 'Errore aggiornamento', variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/hr/shift-templates/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({ title: 'Template eliminato' });
    },
    onError: () => {
      toast({ title: 'Errore eliminazione', variant: 'destructive' });
    }
  });

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      scope: 'global',
      storeId: '',
      pattern: 'daily',
      defaultStartTime: '09:00',
      defaultEndTime: '18:00',
      defaultRequiredStaff: 1,
    });
    setTimeSlots([{ name: 'Turno Standard', startTime: '09:00', endTime: '18:00', requiredStaff: 1 }]);
    setIsCreating(false);
    setEditingId(null);
  }

  function handleEdit(template: ShiftTemplate) {
    setFormData({
      name: template.name,
      description: template.description || '',
      scope: template.scope || 'global',
      storeId: template.storeId || '',
      pattern: template.pattern,
      defaultStartTime: template.defaultStartTime || '09:00',
      defaultEndTime: template.defaultEndTime || '18:00',
      defaultRequiredStaff: template.defaultRequiredStaff || 1,
    });
    setTimeSlots(template.timeSlots?.map(s => ({
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      requiredStaff: s.requiredStaff || 1
    })) || [{ name: 'Turno Standard', startTime: '09:00', endTime: '18:00', requiredStaff: 1 }]);
    setEditingId(template.id);
    setIsCreating(true);
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: 'Inserisci un nome per il template', variant: 'destructive' });
      return;
    }

    if (formData.scope === 'store' && !formData.storeId) {
      toast({ title: 'Seleziona un negozio per template specifico', variant: 'destructive' });
      return;
    }

    const payload = {
      ...formData,
      storeId: formData.scope === 'store' ? formData.storeId : null,
      timeSlots: timeSlots.map((slot, idx) => ({
        ...slot,
        slotOrder: idx + 1,
      })),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function addTimeSlot() {
    setTimeSlots([...timeSlots, { 
      name: `Fascia ${timeSlots.length + 1}`, 
      startTime: '09:00', 
      endTime: '18:00', 
      requiredStaff: 1 
    }]);
  }

  function removeTimeSlot(index: number) {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter((_, i) => i !== index));
    }
  }

  function updateTimeSlot(index: number, field: keyof TimeSlot, value: string | number) {
    const updated = [...timeSlots];
    updated[index] = { ...updated[index], [field]: value };
    setTimeSlots(updated);
  }

  function getStoreName(storeId: string | undefined) {
    if (!storeId) return '';
    const store = stores.find(s => s.id === storeId);
    return store?.nome || store?.name || storeId;
  }

  const filteredTemplates = templates.filter(t => {
    if (!selectedStoreId) return true;
    return t.scope === 'global' || t.storeId === selectedStoreId;
  });

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Template Turni
            </CardTitle>
            <CardDescription>Crea e gestisci i template per i turni</CardDescription>
          </div>
          {!isCreating && (
            <Button 
              onClick={() => setIsCreating(true)} 
              size="sm"
              data-testid="btn-create-template"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Template
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isCreating && (
          <Card className="border-orange-200 bg-orange-50/30">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nome Template *</Label>
                  <Input
                    id="template-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="es. Turno Mattina"
                    data-testid="input-template-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Applicazione *</Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(v) => setFormData({ ...formData, scope: v as 'global' | 'store' })}
                  >
                    <SelectTrigger data-testid="select-template-scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          Tutti i negozi
                        </div>
                      </SelectItem>
                      <SelectItem value="store">
                        <div className="flex items-center gap-2">
                          <StoreIcon className="w-4 h-4 text-green-500" />
                          Negozio specifico
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.scope === 'store' && (
                <div className="space-y-2">
                  <Label>Negozio *</Label>
                  <Select
                    value={formData.storeId}
                    onValueChange={(v) => setFormData({ ...formData, storeId: v })}
                  >
                    <SelectTrigger data-testid="select-template-store">
                      <SelectValue placeholder="Seleziona negozio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.nome || store.name} {store.code && `(${store.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrizione opzionale..."
                  rows={2}
                  data-testid="input-template-description"
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Fasce Orarie</Label>
                  <Button variant="outline" size="sm" onClick={addTimeSlot}>
                    <Plus className="w-3 h-3 mr-1" />
                    Aggiungi Fascia
                  </Button>
                </div>
                
                {timeSlots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border">
                    <Input
                      value={slot.name}
                      onChange={(e) => updateTimeSlot(idx, 'name', e.target.value)}
                      placeholder="Nome fascia"
                      className="flex-1"
                      data-testid={`input-slot-name-${idx}`}
                    />
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateTimeSlot(idx, 'startTime', e.target.value)}
                      className="w-28"
                      data-testid={`input-slot-start-${idx}`}
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateTimeSlot(idx, 'endTime', e.target.value)}
                      className="w-28"
                      data-testid={`input-slot-end-${idx}`}
                    />
                    <Input
                      type="number"
                      min={1}
                      value={slot.requiredStaff || 1}
                      onChange={(e) => updateTimeSlot(idx, 'requiredStaff', parseInt(e.target.value) || 1)}
                      className="w-16"
                      title="Risorse richieste"
                      data-testid={`input-slot-staff-${idx}`}
                    />
                    {timeSlots.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeTimeSlot(idx)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  Annulla
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="btn-save-template"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Aggiorna' : 'Crea Template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {templatesLoading ? (
          <div className="text-center py-8 text-muted-foreground">Caricamento template...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nessun template disponibile</p>
            <p className="text-sm">Crea il primo template per iniziare</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    "border rounded-lg p-3 transition-colors cursor-pointer hover:bg-muted/50",
                    expandedId === template.id && "bg-muted/30"
                  )}
                  onClick={() => {
                    setExpandedId(expandedId === template.id ? null : template.id);
                    onTemplateSelect?.(template);
                  }}
                  data-testid={`template-item-${template.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {template.name}
                          {template.scope === 'global' ? (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              <Globe className="w-3 h-3 mr-1" />
                              GLOBALE
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                              <StoreIcon className="w-3 h-3 mr-1" />
                              {getStoreName(template.storeId)}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {template.timeSlots?.length || 1} fasce • 
                          {template.defaultStartTime && ` ${template.defaultStartTime}-${template.defaultEndTime}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                        data-testid={`btn-edit-template-${template.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Eliminare questo template?')) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                        data-testid={`btn-delete-template-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                      {expandedId === template.id ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {expandedId === template.id && template.timeSlots && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {template.timeSlots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">{slot.name}:</span>
                          <span>{slot.startTime} - {slot.endTime}</span>
                          <Badge variant="outline" className="text-xs">
                            {slot.requiredStaff || 1} risorse
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
