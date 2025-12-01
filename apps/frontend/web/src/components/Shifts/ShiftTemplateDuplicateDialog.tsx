import { useState, useEffect, useId } from 'react';
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
import { Plus, X, Trash2, Clock, Copy, Store as StoreIcon } from 'lucide-react';

import { shiftTemplateSchema, TEMPLATE_COLORS, type ShiftTemplateFormData, type ShiftTemplate } from './shiftTemplateSchemas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  template: ShiftTemplate | null;
}

function getDefaultFormValues(template: ShiftTemplate | null): ShiftTemplateFormData {
  if (!template) {
    return {
      name: '',
      description: '',
      storeId: 'global',
      status: 'active',
      shiftType: 'slot_based',
      globalClockInTolerance: 15,
      globalClockOutTolerance: 15,
      globalBreakMinutes: 30,
      isActive: true,
      notes: '',
      color: '#f97316',
      timeSlots: [{ segmentType: 'continuous', startTime: '09:00', endTime: '17:00', breakMinutes: 30, clockInToleranceMinutes: 15, clockOutToleranceMinutes: 15 }]
    };
  }
  
  const duplicateName = template.name?.includes('(Copia)') ? template.name : `${template.name} (Copia)`;
  
  return {
    name: duplicateName,
    description: template.description || '',
    storeId: template.storeId || 'global',
    status: 'active',
    shiftType: (template.shiftType as 'slot_based' | 'split_shift') || 'slot_based',
    globalClockInTolerance: template.globalClockInTolerance || 15,
    globalClockOutTolerance: template.globalClockOutTolerance || 15,
    globalBreakMinutes: template.globalBreakMinutes || 30,
    isActive: true,
    notes: template.notes || '',
    color: template.color || '#f97316',
    timeSlots: (template.timeSlots && template.timeSlots.length > 0) ? template.timeSlots.map(slot => ({
      segmentType: slot.segmentType || 'continuous',
      startTime: slot.startTime || '09:00',
      endTime: slot.endTime || '17:00',
      block2StartTime: slot.block2StartTime,
      block2EndTime: slot.block2EndTime,
      block3StartTime: slot.block3StartTime,
      block3EndTime: slot.block3EndTime,
      block4StartTime: slot.block4StartTime,
      block4EndTime: slot.block4EndTime,
      breakMinutes: slot.breakMinutes || 30,
      clockInToleranceMinutes: slot.clockInToleranceMinutes || 15,
      clockOutToleranceMinutes: slot.clockOutToleranceMinutes || 15
    })) : [{ segmentType: 'continuous', startTime: '09:00', endTime: '17:00', breakMinutes: 30, clockInToleranceMinutes: 15, clockOutToleranceMinutes: 15 }]
  };
}

export default function ShiftTemplateDuplicateDialog({ isOpen, onClose, template }: Props) {
  const dialogId = useId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores']
  });
  
  const form = useForm<ShiftTemplateFormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: getDefaultFormValues(null)
  });

  const [blockCounts, setBlockCounts] = useState<Record<number, number>>({});

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'timeSlots'
  });

  useEffect(() => {
    if (isOpen && template) {
      const values = getDefaultFormValues(template);
      replace(values.timeSlots);
      form.reset(values, { keepDefaultValues: false });
      
      const counts: Record<number, number> = {};
      const slots = template.timeSlots || [];
      slots.forEach((slot, index) => {
        if (slot.segmentType === 'quad') counts[index] = 4;
        else if (slot.segmentType === 'triple') counts[index] = 3;
        else if (slot.segmentType === 'split') counts[index] = 2;
        else counts[index] = 1;
      });
      setBlockCounts(counts);
    } else if (!isOpen) {
      setBlockCounts({});
    }
  }, [isOpen, template?.id, replace]);

  const shiftType = form.watch('shiftType');

  const duplicateMutation = useMutation({
    mutationFn: async (data: ShiftTemplateFormData) => {
      let templateName = data.name;
      if (!templateName.includes('(Copia)')) {
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
      
      return await apiRequest('/api/hr/shift-templates', { 
        method: 'POST', 
        body: JSON.stringify(enterpriseData) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({ 
        title: "Template Duplicato", 
        description: "Il template è stato copiato con successo" 
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Errore nella duplicazione del template", 
        variant: "destructive" 
      });
    }
  });

  const handleClose = () => {
    form.reset(getDefaultFormValues(null));
    setBlockCounts({});
    onClose();
  };

  const handleSubmit = (data: ShiftTemplateFormData) => {
    duplicateMutation.mutate(data);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-dialog-id={dialogId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-purple-500" />
            Duplica Template Turni
          </DialogTitle>
          <DialogDescription>
            Crea una copia del template selezionato con un nuovo nome
          </DialogDescription>
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
                      <FormControl><Input {...field} placeholder="es. Turno Mattina Standard (Copia)" data-testid="input-duplicate-template-name" /></FormControl>
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
                            title={color.name} />
                        ))}
                      </div>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl><Textarea {...field} placeholder="Descrizione opzionale del template..." className="min-h-[80px]" data-testid="input-duplicate-template-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="storeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><StoreIcon className="w-4 h-4" />Ambito Applicazione</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={storesLoading}>
                        <FormControl><SelectTrigger data-testid="select-duplicate-template-store"><SelectValue placeholder="Seleziona punto vendita" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="global" className="font-semibold text-orange-600">Tutti i Punti Vendita (Globale)</SelectItem>
                          {stores?.map((store: any) => (<SelectItem key={store.id} value={store.id}>{store.nome || store.name} - {store.code}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="shiftType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Turnazione *</FormLabel>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col gap-3 pt-2">
                          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value="slot_based" id="dup-shift-type-slot" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="dup-shift-type-slot" className="cursor-pointer font-medium">Turnazione a Fascia</Label>
                              <p className="text-sm text-muted-foreground mt-1">Ogni fascia oraria è un turno separato</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <RadioGroupItem value="split_shift" id="dup-shift-type-split" className="mt-1" />
                            <div className="flex-1">
                              <Label htmlFor="dup-shift-type-split" className="cursor-pointer font-medium">Turnazione Spezzata</Label>
                              <p className="text-sm text-muted-foreground mt-1">Tutte le fasce formano 1 unico turno</p>
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
                  <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-orange-600" />Tolleranze Globali</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="globalClockInTolerance" render={({ field }) => (
                      <FormItem><FormLabel>Tolleranza Clock-In (minuti)</FormLabel><FormControl><Input {...field} type="number" min="0" max="60" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="globalClockOutTolerance" render={({ field }) => (
                      <FormItem><FormLabel>Tolleranza Clock-Out (minuti)</FormLabel><FormControl><Input {...field} type="number" min="0" max="60" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="globalBreakMinutes" render={({ field }) => (
                      <FormItem><FormLabel>Pausa (minuti)</FormLabel><FormControl><Input {...field} type="number" min="0" max="480" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle className="text-lg">Fasce Orarie</CardTitle></div>
                  <Button type="button" variant="outline" size="sm" onClick={addTimeSlot} disabled={fields.length >= 5} data-testid="button-dup-add-time-slot"><Plus className="w-4 h-4 mr-2" />Aggiungi</Button>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <FormField control={form.control} name={`timeSlots.${index}.startTime`} render={({ field }) => (
                        <FormItem><FormLabel>Ora Inizio</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`timeSlots.${index}.endTime`} render={({ field }) => (
                        <FormItem><FormLabel>Ora Fine</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    
                    {getBlockCount(index) >= 2 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2"><Label className="text-xs text-muted-foreground">Blocco 2</Label><Button type="button" variant="ghost" size="sm" onClick={() => removeBlock(index, 2)} className="text-red-600 h-6 px-2"><X className="w-3 h-3" /></Button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`timeSlots.${index}.block2StartTime`} render={({ field }) => (<FormItem><FormLabel>Inizio</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>)} />
                          <FormField control={form.control} name={`timeSlots.${index}.block2EndTime`} render={({ field }) => (<FormItem><FormLabel>Fine</FormLabel><FormControl><Input {...field} type="time" /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                      </div>
                    )}
                    
                    {shiftType === 'slot_based' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                        <FormField control={form.control} name={`timeSlots.${index}.clockInToleranceMinutes`} render={({ field }) => (
                          <FormItem><FormLabel>Toll. Entrata (min)</FormLabel><FormControl><Input {...field} type="number" min="0" max="60" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`timeSlots.${index}.clockOutToleranceMinutes`} render={({ field }) => (
                          <FormItem><FormLabel>Toll. Uscita (min)</FormLabel><FormControl><Input {...field} type="number" min="0" max="60" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`timeSlots.${index}.breakMinutes`} render={({ field }) => (
                          <FormItem><FormLabel>Pausa (min)</FormLabel><FormControl><Input {...field} type="number" min="0" max="480" onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    )}
                    
                    {getBlockCount(index) < 4 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => addBlock(index)} className="mt-2"><Plus className="w-3 h-3 mr-1" />Aggiungi Blocco</Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <div><span className="text-sm text-muted-foreground">Ore Totali Template</span><div className="text-2xl font-bold text-purple-700">{totalHours.toFixed(1)}h</div></div>
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">{fields.length} {fields.length === 1 ? 'fascia' : 'fasce'}</Badge>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>Annulla</Button>
              <Button type="submit" disabled={duplicateMutation.isPending} className="bg-gradient-to-r from-purple-500 to-purple-600" data-testid="button-save-duplicate-template">
                {duplicateMutation.isPending ? <><Copy className="w-4 h-4 mr-2 animate-spin" />Duplicando...</> : <><Copy className="w-4 h-4 mr-2" />Duplica Template</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
