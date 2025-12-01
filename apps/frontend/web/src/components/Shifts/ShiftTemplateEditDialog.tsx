import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Trash2, Clock, AlertTriangle, CheckCircle, Save, Store as StoreIcon, Loader2 } from 'lucide-react';

import { shiftTemplateSchema, TEMPLATE_COLORS, getDefaultFormValues, type ShiftTemplateFormData, type ShiftTemplate } from './shiftTemplateSchemas';

interface ShiftTemplateEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string | null;
}

const EMPTY_DEFAULTS: ShiftTemplateFormData = {
  name: '',
  description: '',
  storeId: 'global',
  status: 'active',
  shiftType: 'slot_based',
  globalClockInTolerance: 15,
  globalClockOutTolerance: 15,
  globalBreakMinutes: 30,
  timeSlots: [{ segmentType: 'continuous', startTime: '09:00', endTime: '17:00', breakMinutes: 30, clockInToleranceMinutes: 15, clockOutToleranceMinutes: 15 }],
  color: '#FF6900',
  isActive: true,
  notes: ''
};

export default function ShiftTemplateEditDialog({ isOpen, onClose, templateId }: ShiftTemplateEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const lastTemplateIdRef = useRef<string | null>(null);
  const [blockCounts, setBlockCounts] = useState<Record<number, number>>({});

  const { data: template, isLoading: templateLoading } = useQuery<ShiftTemplate>({
    queryKey: ['/api/hr/shift-templates', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      const tenantId = localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001';
      const response = await fetch(`/api/hr/shift-templates/${templateId}`, {
        credentials: 'include',
        headers: { 'X-Tenant-ID': tenantId, 'X-Auth-Session': 'authenticated', 'X-Demo-User': 'admin-user' }
      });
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json();
    },
    enabled: !!templateId && isOpen
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores'],
    enabled: isOpen
  });

  const form = useForm<ShiftTemplateFormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: EMPTY_DEFAULTS,
    mode: 'onChange'
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'timeSlots'
  });

  useEffect(() => {
    if (!isOpen) {
      lastTemplateIdRef.current = null;
      setBlockCounts({});
      return;
    }

    if (isOpen && template && templateId && templateId !== lastTemplateIdRef.current) {
      lastTemplateIdRef.current = templateId;
      
      const formValues = getDefaultFormValues(template, 'edit');
      
      replace(formValues.timeSlots);
      
      form.reset(formValues, { keepDefaultValues: false });
      
      const counts: Record<number, number> = {};
      formValues.timeSlots.forEach((slot, index) => {
        if (slot.segmentType === 'quad') counts[index] = 4;
        else if (slot.segmentType === 'triple') counts[index] = 3;
        else if (slot.segmentType === 'split') counts[index] = 2;
        else counts[index] = 1;
      });
      setBlockCounts(counts);
    }
  }, [isOpen, template, templateId, replace, form]);

  const shiftType = form.watch('shiftType');
  const selectedStoreId = form.watch('storeId');

  const { data: coverage, isLoading: coverageLoading } = useQuery({
    queryKey: ['/api/hr/shift-templates', templateId, 'verify-coverage', selectedStoreId],
    queryFn: async () => {
      if (!templateId || !selectedStoreId) return null;
      const tenantId = localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001';
      const response = await fetch(`/api/hr/shift-templates/${templateId}/verify-coverage?storeId=${selectedStoreId}`, {
        credentials: 'include',
        headers: { 'X-Tenant-ID': tenantId, 'X-Auth-Session': 'authenticated', 'X-Demo-User': 'admin-user' }
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!templateId && !!selectedStoreId && isOpen
  });

  const editMutation = useMutation({
    mutationFn: async (data: ShiftTemplateFormData) => {
      if (!templateId) throw new Error('Template ID mancante');
      
      const enterpriseData = {
        name: data.name,
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
      
      return await apiRequest(`/api/hr/shift-templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(enterpriseData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({ title: "Template Aggiornato", description: "Il template turni è stato aggiornato con successo" });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nel salvataggio del template",
        variant: "destructive",
      });
    }
  });

  const handleClose = useCallback(() => {
    form.reset(EMPTY_DEFAULTS, { keepDefaultValues: false });
    replace(EMPTY_DEFAULTS.timeSlots);
    setBlockCounts({});
    lastTemplateIdRef.current = null;
    onClose();
  }, [form, replace, onClose]);

  const handleSubmit = useCallback((data: ShiftTemplateFormData) => {
    editMutation.mutate(data);
  }, [editMutation]);

  const addTimeSlot = useCallback(() => {
    if (fields.length >= 5) {
      toast({ title: "Limite Raggiunto", description: "Massimo 5 fasce orarie per template", variant: "destructive" });
      return;
    }
    append({ segmentType: 'continuous', startTime: '09:00', endTime: '17:00', breakMinutes: 30, clockInToleranceMinutes: 15, clockOutToleranceMinutes: 15 });
    setBlockCounts(prev => ({ ...prev, [fields.length]: 1 }));
  }, [fields.length, append, toast]);

  const removeTimeSlot = useCallback((index: number) => {
    if (fields.length <= 1) {
      toast({ title: "Errore", description: "Deve esserci almeno una fascia oraria", variant: "destructive" });
      return;
    }
    remove(index);
    setBlockCounts(prev => {
      const newCounts: Record<number, number> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const keyNum = parseInt(key);
        if (keyNum < index) newCounts[keyNum] = value;
        else if (keyNum > index) newCounts[keyNum - 1] = value;
      });
      return newCounts;
    });
  }, [fields.length, remove, toast]);

  const getBlockCount = useCallback((index: number) => blockCounts[index] || 1, [blockCounts]);

  const setBlockCount = useCallback((index: number, count: number) => {
    const segmentTypeMap: Record<number, 'continuous' | 'split' | 'triple' | 'quad'> = { 1: 'continuous', 2: 'split', 3: 'triple', 4: 'quad' };
    form.setValue(`timeSlots.${index}.segmentType`, segmentTypeMap[count] || 'continuous');
    setBlockCounts(prev => ({ ...prev, [index]: count }));
  }, [form]);

  const dialogContent = useMemo(() => {
    if (templateLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-2">Caricamento template...</span>
        </div>
      );
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Informazioni Base
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Template *</FormLabel>
                          <FormControl>
                            <Input placeholder="es. Turno Mattina" {...field} data-testid="input-template-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="storeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Punto Vendita</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-store">
                                <SelectValue placeholder="Seleziona punto vendita" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="global">
                                <div className="flex items-center gap-2">
                                  <StoreIcon className="h-4 w-4" />
                                  Globale (tutti i PV)
                                </div>
                              </SelectItem>
                              {Array.isArray(stores) && stores.map((store: any) => (
                                <SelectItem key={store.id} value={store.id}>
                                  <div className="flex items-center gap-2">
                                    <StoreIcon className="h-4 w-4" />
                                    {store.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                          <Textarea placeholder="Descrizione del template..." {...field} data-testid="input-template-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Colore</FormLabel>
                        <div className="flex gap-2">
                          {TEMPLATE_COLORS.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() => field.onChange(color.value)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${field.value === color.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                              data-testid={`color-${color.name.toLowerCase().replace(' ', '-')}`}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tipo Turnazione
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="shiftType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 gap-4">
                            <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'slot_based' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                              <RadioGroupItem value="slot_based" id="edit-slot_based" />
                              <label htmlFor="edit-slot_based" className="cursor-pointer">
                                <div className="font-medium">Turno Singolo</div>
                                <div className="text-xs text-muted-foreground">Orario continuativo</div>
                              </label>
                            </div>
                            <div className={`flex items-center space-x-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${field.value === 'split_shift' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                              <RadioGroupItem value="split_shift" id="edit-split_shift" />
                              <label htmlFor="edit-split_shift" className="cursor-pointer">
                                <div className="font-medium">Turno Spezzato</div>
                                <div className="text-xs text-muted-foreground">Più blocchi orari</div>
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {shiftType === 'split_shift' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Impostazioni Globali Turno Spezzato</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="globalClockInTolerance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tolleranza Entrata (min)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-clock-in-tolerance" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="globalClockOutTolerance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tolleranza Uscita (min)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-clock-out-tolerance" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="globalBreakMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pausa (min)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-break-minutes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Fasce Orarie ({fields.length}/5)
                    </CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={addTimeSlot} disabled={fields.length >= 5} data-testid="button-add-timeslot">
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi Fascia
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Fascia {index + 1}</Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Blocchi:</span>
                          {[1, 2, 3, 4].map((count) => (
                            <button
                              key={count}
                              type="button"
                              onClick={() => setBlockCount(index, count)}
                              className={`w-6 h-6 text-xs rounded border ${getBlockCount(index) === count ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 hover:border-orange-300'}`}
                              data-testid={`button-block-count-${index}-${count}`}
                            >
                              {count}
                            </button>
                          ))}
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeTimeSlot(index)} className="text-red-500 hover:text-red-700" data-testid={`button-remove-timeslot-${index}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`timeSlots.${index}.startTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inizio Blocco 1</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid={`input-start-time-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`timeSlots.${index}.endTime`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fine Blocco 1</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} data-testid={`input-end-time-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {getBlockCount(index) >= 2 && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block2StartTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inizio Blocco 2</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} value={field.value || ''} data-testid={`input-block2-start-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block2EndTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fine Blocco 2</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} value={field.value || ''} data-testid={`input-block2-end-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {getBlockCount(index) >= 3 && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block3StartTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inizio Blocco 3</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} value={field.value || ''} data-testid={`input-block3-start-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block3EndTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fine Blocco 3</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} value={field.value || ''} data-testid={`input-block3-end-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {getBlockCount(index) >= 4 && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block4StartTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Inizio Blocco 4</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} value={field.value || ''} data-testid={`input-block4-start-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block4EndTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fine Blocco 4</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} value={field.value || ''} data-testid={`input-block4-end-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      {shiftType === 'slot_based' && (
                        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.breakMinutes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pausa (min)</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid={`input-break-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.clockInToleranceMinutes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Toll. Entrata</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid={`input-clock-in-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.clockOutToleranceMinutes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Toll. Uscita</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} data-testid={`input-clock-out-${index}`} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {coverage && (
                <Alert variant={coverage.hasIssues ? "destructive" : "default"}>
                  {coverage.hasIssues ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  <AlertDescription>
                    {coverage.hasIssues 
                      ? `Attenzione: ${coverage.issues?.length || 0} problemi di copertura rilevati`
                      : 'Copertura verificata con successo'
                    }
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Note aggiuntive..." {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel-edit">
              Annulla
            </Button>
            <Button type="submit" disabled={editMutation.isPending} data-testid="button-save-edit">
              {editMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  }, [form, fields, shiftType, coverage, templateLoading, editMutation.isPending, handleSubmit, handleClose, addTimeSlot, removeTimeSlot, getBlockCount, setBlockCount, stores]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]" data-testid="dialog-edit-template">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Modifica Template Turni
          </DialogTitle>
          <DialogDescription>
            Modifica i dettagli del template turni esistente
          </DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
