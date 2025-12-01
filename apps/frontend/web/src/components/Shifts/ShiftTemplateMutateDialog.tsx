import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, X, Trash2, Clock, AlertTriangle, CheckCircle, Save, Store as StoreIcon } from 'lucide-react';

import { shiftTemplateSchema, TEMPLATE_COLORS, getDefaultFormValues, type ShiftTemplateFormData, type ShiftTemplate } from './shiftTemplateSchemas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  template: ShiftTemplate;
  mode: 'edit' | 'duplicate';
}

export default function ShiftTemplateMutateDialog({ isOpen, onClose, template, mode }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores']
  });
  
  const form = useForm<ShiftTemplateFormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: getDefaultFormValues(template, mode)
  });

  const [blockCounts, setBlockCounts] = useState<Record<number, number>>(() => {
    const counts: Record<number, number> = {};
    const slots = template.timeSlots || [];
    slots.forEach((slot, index) => {
      if (slot.segmentType === 'quad') counts[index] = 4;
      else if (slot.segmentType === 'triple') counts[index] = 3;
      else if (slot.segmentType === 'split') counts[index] = 2;
      else counts[index] = 1;
    });
    return counts;
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'timeSlots'
  });

  const shiftType = form.watch('shiftType');
  const selectedStoreId = form.watch('storeId');

  const { data: coverage, isLoading: coverageLoading } = useQuery({
    queryKey: mode === 'edit' ? ['/api/hr/shift-templates', template.id, 'verify-coverage', selectedStoreId] : ['coverage-disabled'],
    queryFn: async () => {
      if (mode !== 'edit' || !template?.id || !selectedStoreId) return null;
      const tenantId = localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001';
      const response = await fetch(`/api/hr/shift-templates/${template.id}/verify-coverage?storeId=${selectedStoreId}`, {
        credentials: 'include',
        headers: { 'X-Tenant-ID': tenantId, 'X-Auth-Session': 'authenticated', 'X-Demo-User': 'admin-user' }
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: mode === 'edit' && !!template?.id && !!selectedStoreId
  });

  const mutateMutation = useMutation({
    mutationFn: async (data: ShiftTemplateFormData) => {
      let templateName = data.name;
      if (mode === 'duplicate' && !templateName.includes('(Copia)')) {
        templateName = `${templateName} (Copia)`;
      }
      
      const enterpriseData = {
        name: templateName,
        description: data.description,
        storeId: data.storeId === 'global' ? null : data.storeId,
        scope: data.storeId === 'global' ? 'global' : 'store',
        status: data.status,
        shiftType: data.shiftType,
        globalClockInTolerance: data.globalClockInTolerance,
        globalClockOutTolerance: data.globalClockOutTolerance,
        globalBreakMinutes: data.globalBreakMinutes,
        pattern: 'weekly',
        defaultStartTime: data.timeSlots[0]?.startTime || '09:00',
        defaultEndTime: data.timeSlots[0]?.endTime || '17:00',
        defaultRequiredStaff: 2,
        defaultBreakMinutes: data.timeSlots[0]?.breakMinutes || 30,
        clockInToleranceMinutes: data.timeSlots[0]?.clockInToleranceMinutes || 15,
        clockOutToleranceMinutes: data.timeSlots[0]?.clockOutToleranceMinutes || 15,
        isActive: data.isActive,
        notes: data.notes,
        color: data.color,
        timeSlots: data.timeSlots
      };
      
      const endpoint = mode === 'edit' ? `/api/hr/shift-templates/${template.id}` : '/api/hr/shift-templates';
      const method = mode === 'edit' ? 'PUT' : 'POST';
      
      return await apiRequest(endpoint, { method, body: JSON.stringify(enterpriseData) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      const successMessages = {
        edit: { title: "Template Aggiornato", desc: "È stata creata una nuova versione del template. I turni futuri sono stati aggiornati." },
        duplicate: { title: "Template Duplicato", desc: "Il template è stato copiato con successo" }
      };
      const { title, desc } = successMessages[mode];
      toast({ title, description: desc });
      handleClose();
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message || "Errore nel salvataggio del template", variant: "destructive" });
    }
  });

  const handleClose = () => {
    form.reset();
    setBlockCounts({});
    onClose();
  };

  const handleSubmit = (data: ShiftTemplateFormData) => {
    mutateMutation.mutate(data);
  };

  const addTimeSlot = () => {
    if (fields.length >= 5) {
      toast({ title: "Limite Raggiunto", description: "Massimo 5 fasce orarie per template", variant: "destructive" });
      return;
    }
    append({ segmentType: 'continuous', startTime: '09:00', endTime: '17:00', breakMinutes: 30, clockInToleranceMinutes: 15, clockOutToleranceMinutes: 15 });
  };

  const removeTimeSlot = (index: number) => {
    if (fields.length <= 1) {
      toast({ title: "Operazione Non Consentita", description: "Almeno una fascia oraria è richiesta", variant: "destructive" });
      return;
    }
    remove(index);
    setBlockCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[index];
      const reindexed: Record<number, number> = {};
      Object.keys(newCounts).forEach((key) => {
        const keyNum = parseInt(key);
        if (keyNum > index) reindexed[keyNum - 1] = newCounts[keyNum];
        else if (keyNum < index) reindexed[keyNum] = newCounts[keyNum];
      });
      return reindexed;
    });
  };

  const addBlock = (slotIndex: number) => {
    const currentCount = blockCounts[slotIndex] || 1;
    if (currentCount >= 4) {
      toast({ title: "Limite Raggiunto", description: "Massimo 4 blocchi per fascia oraria", variant: "destructive" });
      return;
    }
    const newCount = currentCount + 1;
    setBlockCounts((prev) => ({ ...prev, [slotIndex]: newCount }));
    const segmentTypeMap: Record<number, 'continuous' | 'split' | 'triple' | 'quad'> = { 1: 'continuous', 2: 'split', 3: 'triple', 4: 'quad' };
    form.setValue(`timeSlots.${slotIndex}.segmentType`, segmentTypeMap[newCount]);
  };

  const removeBlock = (slotIndex: number, blockNumber: number) => {
    const currentCount = blockCounts[slotIndex] || 1;
    if (currentCount <= 1) {
      toast({ title: "Operazione Non Consentita", description: "Almeno un blocco è richiesto", variant: "destructive" });
      return;
    }
    if (blockNumber === 2) { form.setValue(`timeSlots.${slotIndex}.block2StartTime`, undefined); form.setValue(`timeSlots.${slotIndex}.block2EndTime`, undefined); }
    else if (blockNumber === 3) { form.setValue(`timeSlots.${slotIndex}.block3StartTime`, undefined); form.setValue(`timeSlots.${slotIndex}.block3EndTime`, undefined); }
    else if (blockNumber === 4) { form.setValue(`timeSlots.${slotIndex}.block4StartTime`, undefined); form.setValue(`timeSlots.${slotIndex}.block4EndTime`, undefined); }
    const newCount = currentCount - 1;
    setBlockCounts((prev) => ({ ...prev, [slotIndex]: newCount }));
    const segmentTypeMap: Record<number, 'continuous' | 'split' | 'triple' | 'quad'> = { 1: 'continuous', 2: 'split', 3: 'triple', 4: 'quad' };
    form.setValue(`timeSlots.${slotIndex}.segmentType`, segmentTypeMap[newCount]);
  };

  const getBlockCount = (slotIndex: number) => blockCounts[slotIndex] || 1;

  const calculateTotalHours = (timeSlots: any[]) => {
    return timeSlots.reduce((total, slot) => {
      const start = new Date(`2000-01-01T${slot.startTime}`);
      const end = new Date(`2000-01-01T${slot.endTime}`);
      if (end <= start) end.setDate(end.getDate() + 1);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const breakHours = (slot.breakMinutes || 0) / 60;
      return total + Math.max(0, hours - breakHours);
    }, 0);
  };

  const watchedTimeSlots = form.watch('timeSlots');
  const totalHours = calculateTotalHours(watchedTimeSlots || []);

  const dialogTitle = mode === 'edit' ? 'Modifica Template Turni' : 'Duplica Template Turni';
  const dialogDesc = mode === 'edit' 
    ? 'Modifica le impostazioni del template. Verrà creata una nuova versione e i turni futuri saranno aggiornati.'
    : 'Crea una copia del template selezionato con un nuovo nome';
  const buttonLabel = mode === 'edit' ? 'Aggiorna Template' : 'Duplica Template';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription>{dialogDesc}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Informazioni Base</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Template *</FormLabel>
                      <FormControl><Input {...field} placeholder="es. Turno Mattina Standard" data-testid="input-template-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colore Template</FormLabel>
                      <div className="flex gap-2 flex-wrap">
                        {TEMPLATE_COLORS.map((color) => (
                          <button key={color.value} type="button" onClick={() => field.onChange(color.value)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${field.value === color.value ? 'border-gray-900 scale-110' : 'border-gray-300'} ${color.class}`}
                            data-testid={`color-${color.name.toLowerCase().replace(' ', '-')}`} title={color.name} />
                        ))}
                      </div>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Descrizione opzionale del template..." className="min-h-[80px]" data-testid="input-template-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="storeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><StoreIcon className="w-4 h-4" />Ambito Applicazione</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={storesLoading}>
                        <FormControl><SelectTrigger data-testid="select-template-store"><SelectValue placeholder="Seleziona punto vendita" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="global" className="font-semibold text-orange-600">🌐 Tutti i Punti Vendita (Globale)</SelectItem>
                          {stores?.map((store: any) => (<SelectItem key={store.id} value={store.id}>{store.nome || store.name} - {store.code}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      
                      {mode === 'edit' && selectedStoreId && coverage && !coverageLoading && (
                        <div className="mt-2">
                          {coverage.sufficient ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid="badge-coverage-sufficient">
                              <CheckCircle className="w-3 h-3 mr-1" />{coverage.available} {coverage.available === 1 ? 'risorsa disponibile' : 'risorse disponibili'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200" data-testid="badge-coverage-insufficient">
                              <AlertTriangle className="w-3 h-3 mr-1" />Solo {coverage.available} {coverage.available === 1 ? 'risorsa' : 'risorse'}, ne {coverage.required === 1 ? 'serve' : 'servono'} {coverage.required}
                            </Badge>
                          )}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato Template</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-4 pt-2">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="active" id="status-active" /><Label htmlFor="status-active" className="cursor-pointer">Attivo</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="archived" id="status-archived" /><Label htmlFor="status-archived" className="cursor-pointer">Archiviato</Label></div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="shiftType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Turnazione *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col gap-3 pt-2">
                          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value="slot_based" id="shift-type-slot" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="shift-type-slot" className="cursor-pointer font-medium">Turnazione a Fascia</Label>
                              <p className="text-sm text-muted-foreground mt-1">Ogni fascia oraria è un turno separato con proprie tolleranze e pausa</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value="split_shift" id="shift-type-split" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="shift-type-split" className="cursor-pointer font-medium">Turnazione Spezzata</Label>
                              <p className="text-sm text-muted-foreground mt-1">Tutte le fasce insieme formano 1 unico turno con tolleranze e pausa globali</p>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {shiftType === 'split_shift' && (
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-orange-600" />Tolleranze Globali (Turno Unico)</CardTitle>
                  <p className="text-sm text-muted-foreground">Queste tolleranze e pausa si applicano all'intero turno spezzato</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="globalClockInTolerance" render={({ field }) => (
                      <FormItem><FormLabel>Tolleranza Clock-In (minuti) *</FormLabel><FormControl><Input {...field} type="number" min="0" max="60" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="globalClockOutTolerance" render={({ field }) => (
                      <FormItem><FormLabel>Tolleranza Clock-Out (minuti) *</FormLabel><FormControl><Input {...field} type="number" min="0" max="60" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="globalBreakMinutes" render={({ field }) => (
                      <FormItem><FormLabel>Pausa (minuti) *</FormLabel><FormControl><Input {...field} type="number" min="0" max="480" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Alert className="mt-4 bg-blue-50 border-blue-200">
                    <AlertDescription className="text-sm text-blue-800"><strong>Esempio:</strong> Se crei fasce 09:00-13:00 e 14:00-18:00, il dipendente fa clock-in solo all'inizio (09:00) e clock-out solo alla fine (18:00). La pausa si applica una volta sola.</AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle className="text-lg">Fasce Orarie</CardTitle><p className="text-sm text-muted-foreground mt-1">Definisci le fasce orarie del template</p></div>
                  <Button type="button" variant="outline" size="sm" onClick={addTimeSlot} disabled={fields.length >= 5} data-testid="button-add-time-slot"><Plus className="w-4 h-4 mr-2" />Aggiungi Fascia</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-medium">Fascia {index + 1}</Label>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeTimeSlot(index)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                    
                    <div className="mb-3 pb-3 border-b">
                      <div className="flex items-center justify-between mb-2"><Label className="text-xs text-muted-foreground">Blocco 1</Label></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`timeSlots.${index}.startTime`} render={({ field }) => (
                          <FormItem><FormLabel>Ora Inizio</FormLabel><FormControl><Input {...field} type="time" data-testid={`input-start-time-${index}`} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`timeSlots.${index}.endTime`} render={({ field }) => (
                          <FormItem><FormLabel>Ora Fine</FormLabel><FormControl><Input {...field} type="time" data-testid={`input-end-time-${index}`} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                    
                    {getBlockCount(index) >= 2 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2"><Label className="text-xs text-muted-foreground">Blocco 2</Label><Button type="button" variant="ghost" size="sm" onClick={() => removeBlock(index, 2)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2"><X className="w-3 h-3" /></Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`timeSlots.${index}.block2StartTime`} render={({ field }) => (<FormItem><FormLabel>Ora Inizio Blocco 2</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`timeSlots.${index}.block2EndTime`} render={({ field }) => (<FormItem><FormLabel>Ora Fine Blocco 2</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </div>
                    )}
                    
                    {getBlockCount(index) >= 3 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2"><Label className="text-xs text-muted-foreground">Blocco 3</Label><Button type="button" variant="ghost" size="sm" onClick={() => removeBlock(index, 3)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2"><X className="w-3 h-3" /></Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`timeSlots.${index}.block3StartTime`} render={({ field }) => (<FormItem><FormLabel>Ora Inizio Blocco 3</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`timeSlots.${index}.block3EndTime`} render={({ field }) => (<FormItem><FormLabel>Ora Fine Blocco 3</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </div>
                    )}
                    
                    {getBlockCount(index) >= 4 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2"><Label className="text-xs text-muted-foreground">Blocco 4</Label><Button type="button" variant="ghost" size="sm" onClick={() => removeBlock(index, 4)} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2"><X className="w-3 h-3" /></Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`timeSlots.${index}.block4StartTime`} render={({ field }) => (<FormItem><FormLabel>Ora Inizio Blocco 4</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`timeSlots.${index}.block4EndTime`} render={({ field }) => (<FormItem><FormLabel>Ora Fine Blocco 4</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </div>
                    )}
                    
                    {getBlockCount(index) < 4 && (
                      <div className="mt-3"><Button type="button" variant="outline" size="sm" onClick={() => addBlock(index)} className="w-full"><Plus className="w-4 h-4 mr-2" />Aggiungi Blocco</Button></div>
                    )}
                    
                    {shiftType === 'slot_based' ? (
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <FormField control={form.control} name={`timeSlots.${index}.breakMinutes`} render={({ field }) => (
                          <FormItem><FormLabel>Pausa (minuti)</FormLabel><FormControl><Input {...field} type="number" min="0" max="480" placeholder="30" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`timeSlots.${index}.clockInToleranceMinutes`} render={({ field }) => (
                            <FormItem><FormLabel>Tolleranza Clock-In (minuti)</FormLabel><FormControl><Input {...field} type="number" min="0" max="60" placeholder="15" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`timeSlots.${index}.clockOutToleranceMinutes`} render={({ field }) => (
                            <FormItem><FormLabel>Tolleranza Clock-Out (minuti)</FormLabel><FormControl><Input {...field} type="number" min="0" max="60" placeholder="15" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 pt-4 border-t">
                        <Alert className="bg-blue-50 border-blue-200">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-sm text-blue-800"><strong>Turnazione Spezzata:</strong> Le tolleranze e la pausa sono configurate nelle <strong>Tolleranze Globali</strong> sopra.</AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                ))}
                
                <Alert><CheckCircle className="h-4 w-4" /><AlertDescription><strong>Riepilogo:</strong> {fields.length} {fields.length === 1 ? 'fascia oraria' : 'fasce orarie'}, totale {totalHours.toFixed(1)} ore</AlertDescription></Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Note Aggiuntive</CardTitle></CardHeader>
              <CardContent>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormControl><Textarea {...field} placeholder="Note o istruzioni speciali per questo template..." className="min-h-[100px]" data-testid="input-template-notes" /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            {mode === 'edit' && coverage && !coverage.sufficient && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Copertura risorse insufficiente:</strong> Il punto vendita selezionato ha solo {coverage.available} {coverage.available === 1 ? 'risorsa disponibile' : 'risorse disponibili'}, ma il template richiede {coverage.required} {coverage.required === 1 ? 'risorsa' : 'risorse'}. 
                </AlertDescription>
              </Alert>
            )}

            {Object.keys(form.formState.errors).length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errori di validazione:</strong>
                  <ul className="mt-2 space-y-1">{Object.entries(form.formState.errors).map(([key, error]) => (<li key={key} className="text-sm">• {error?.message || 'Errore sconosciuto'}</li>))}</ul>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleClose} disabled={mutateMutation.isPending}>Annulla</Button>
          <Button 
            onClick={form.handleSubmit(handleSubmit)} 
            disabled={mutateMutation.isPending || (mode === 'edit' && coverage && !coverage.sufficient)} 
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700" 
            data-testid="button-save-template"
          >
            {mutateMutation.isPending ? (<><div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />Salvando...</>) : (<><Save className="w-4 h-4 mr-2" />{buttonLabel}</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
