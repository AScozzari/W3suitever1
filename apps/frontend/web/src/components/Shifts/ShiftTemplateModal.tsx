import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import { Plus, Trash2, Clock, AlertTriangle, CheckCircle, Save } from 'lucide-react';

// ==================== TYPES & SCHEMAS ====================

const timeSlotSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)'),
  breakMinutes: z.number().min(0, 'Pausa non può essere negativa').max(480, 'Pausa troppo lunga (max 8h)').optional()
}).refine((data) => {
  const start = new Date(`2000-01-01T${data.startTime}`);
  const end = new Date(`2000-01-01T${data.endTime}`);
  
  // Handle overnight shifts
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  
  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return diffHours >= 1 && diffHours <= 16; // Min 1h, Max 16h
}, {
  message: 'Fascia oraria deve essere tra 1 e 16 ore',
  path: ['endTime']
});

const shiftTemplateSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve avere almeno 3 caratteri')
    .max(50, 'Nome troppo lungo (max 50 caratteri)'),
  description: z.string().max(200, 'Descrizione troppo lunga (max 200 caratteri)').optional(),
  timeSlots: z.array(timeSlotSchema)
    .min(1, 'Almeno una fascia oraria richiesta')
    .max(5, 'Massimo 5 fasce orarie per template'),
  daysOfWeek: z.array(z.number().min(0).max(6))
    .min(1, 'Seleziona almeno un giorno della settimana'),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().max(500, 'Note troppo lunghe (max 500 caratteri)').optional()
}).superRefine((data, ctx) => {
  // Business Logic Validation: Check for overlapping time slots
  for (let i = 0; i < data.timeSlots.length; i++) {
    for (let j = i + 1; j < data.timeSlots.length; j++) {
      const slot1 = data.timeSlots[i];
      const slot2 = data.timeSlots[j];
      
      const start1 = new Date(`2000-01-01T${slot1.startTime}`);
      const end1 = new Date(`2000-01-01T${slot1.endTime}`);
      const start2 = new Date(`2000-01-01T${slot2.startTime}`);
      const end2 = new Date(`2000-01-01T${slot2.endTime}`);
      
      // Handle overnight shifts
      if (end1 <= start1) end1.setDate(end1.getDate() + 1);
      if (end2 <= start2) end2.setDate(end2.getDate() + 1);
      
      // Check overlap (allow contiguous slots where end1 === start2)
      if ((start1 < end2 && start2 < end1) && !(end1.getTime() === start2.getTime() || end2.getTime() === start1.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Sovrapposizione tra fasce orarie ${i + 1} e ${j + 1}`,
          path: ['timeSlots', i, 'startTime']
        });
      }
    }
  }
});

type ShiftTemplateFormData = z.infer<typeof shiftTemplateSchema>;

// ==================== CONSTANTS ====================

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun', fullName: 'Lunedì' },
  { value: 2, label: 'Mar', fullName: 'Martedì' },
  { value: 3, label: 'Mer', fullName: 'Mercoledì' },
  { value: 4, label: 'Gio', fullName: 'Giovedì' },
  { value: 5, label: 'Ven', fullName: 'Venerdì' },
  { value: 6, label: 'Sab', fullName: 'Sabato' },
  { value: 0, label: 'Dom', fullName: 'Domenica' }
];

const TEMPLATE_COLORS = [
  { name: 'WindTre Orange', value: '#FF6900', class: 'bg-orange-500' },
  { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
  { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Green', value: '#10B981', class: 'bg-emerald-500' },
  { name: 'Red', value: '#EF4444', class: 'bg-red-500' },
  { name: 'Yellow', value: '#F59E0B', class: 'bg-amber-500' }
];

// ==================== MAIN COMPONENT ====================

interface Props {
  isOpen: boolean;
  onClose: () => void;
  template?: any; // For editing existing templates
}

export default function ShiftTemplateModal({ isOpen, onClose, template }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form with default values
  const form = useForm<ShiftTemplateFormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      // Map legacy format to new format for editing
      timeSlots: template?.timeSlots || (template?.defaultStartTime ? [
        { 
          startTime: template.defaultStartTime, 
          endTime: template.defaultEndTime, 
          breakMinutes: template.defaultBreakMinutes || 30 
        }
      ] : [
        { startTime: '09:00', endTime: '17:00', breakMinutes: 30 }
      ]),
      // Map legacy rules.daysOfWeek to new format
      daysOfWeek: template?.daysOfWeek || template?.rules?.daysOfWeek || [1, 2, 3, 4, 5],
      color: template?.color || '#FF6900',
      isActive: template?.isActive ?? true,
      notes: template?.notes || ''
    }
  });

  // Dynamic time slots management
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'timeSlots'
  });

  // Create/Update mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: ShiftTemplateFormData) => {
      const endpoint = template?.id 
        ? `/api/hr/shift-templates/${template.id}` 
        : '/api/hr/shift-templates';
      
      const method = template?.id ? 'PUT' : 'POST';
      
      // Enterprise format with multiple timeSlots support
      const enterpriseData = {
        name: data.name,
        description: data.description,
        pattern: 'weekly', // Default pattern
        defaultStartTime: data.timeSlots[0]?.startTime || '09:00',
        defaultEndTime: data.timeSlots[0]?.endTime || '17:00',
        defaultRequiredStaff: 2, // Default staff
        defaultBreakMinutes: data.timeSlots[0]?.breakMinutes || 30,
        rules: {
          daysOfWeek: data.daysOfWeek
        },
        isActive: data.isActive,
        notes: data.notes,
        color: data.color,
        timeSlots: data.timeSlots // ✅ Now sending full timeSlots array to backend
      };
      
      return await apiRequest(endpoint, {
        method,
        body: JSON.stringify(enterpriseData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({
        title: template?.id ? "Template Aggiornato" : "Template Creato",
        description: "Il template turni è stato salvato con successo",
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nel salvataggio del template",
        variant: "destructive",
      });
    }
  });

  // ==================== HANDLERS ====================

  const handleSubmit = (data: ShiftTemplateFormData) => {
    saveTemplateMutation.mutate(data);
  };

  const addTimeSlot = () => {
    if (fields.length >= 5) {
      toast({
        title: "Limite Raggiunto",
        description: "Massimo 5 fasce orarie per template",
        variant: "destructive"
      });
      return;
    }
    
    append({ startTime: '09:00', endTime: '17:00', breakMinutes: 30 });
  };

  const removeTimeSlot = (index: number) => {
    if (fields.length <= 1) {
      toast({
        title: "Operazione Non Consentita",
        description: "Almeno una fascia oraria è richiesta",
        variant: "destructive"
      });
      return;
    }
    
    remove(index);
  };

  const calculateTotalHours = (timeSlots: any[]) => {
    return timeSlots.reduce((total, slot) => {
      const start = new Date(`2000-01-01T${slot.startTime}`);
      const end = new Date(`2000-01-01T${slot.endTime}`);
      
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const breakHours = (slot.breakMinutes || 0) / 60;
      return total + Math.max(0, hours - breakHours);
    }, 0);
  };

  const watchedTimeSlots = form.watch('timeSlots');
  const watchedDaysOfWeek = form.watch('daysOfWeek');
  const watchedColor = form.watch('color');
  
  const totalHours = calculateTotalHours(watchedTimeSlots || []);
  const totalDays = watchedDaysOfWeek?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            {template?.id ? 'Modifica Template Turni' : 'Nuovo Template Turni'}
          </DialogTitle>
          <DialogDescription>
            {template?.id 
              ? 'Modifica le impostazioni del template turno esistente'
              : 'Crea un nuovo template per organizzare i turni del tuo team'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Template Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informazioni Base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Template *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="es. Turno Mattina Standard"
                            data-testid="input-template-name"
                          />
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
                        <FormLabel>Colore Template</FormLabel>
                        <div className="flex gap-2 flex-wrap">
                          {TEMPLATE_COLORS.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() => field.onChange(color.value)}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                field.value === color.value 
                                  ? 'border-gray-900 dark:border-gray-100 scale-110' 
                                  : 'border-gray-300 dark:border-gray-600'
                              } ${color.class}`}
                              data-testid={`color-${color.name.toLowerCase().replace(' ', '-')}`}
                              title={color.name}
                            />
                          ))}
                        </div>
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
                        <Textarea
                          {...field}
                          placeholder="Descrizione opzionale del template..."
                          className="min-h-[80px]"
                          data-testid="input-template-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Time Slots Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Fasce Orarie</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Definisci le fasce orarie del template
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTimeSlot}
                    disabled={fields.length >= 5}
                    data-testid="button-add-time-slot"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi Fascia
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-medium">Fascia {index + 1}</Label>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-remove-slot-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`timeSlots.${index}.startTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ora Inizio</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="time"
                                data-testid={`input-start-time-${index}`}
                              />
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
                            <FormLabel>Ora Fine</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="time"
                                data-testid={`input-end-time-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`timeSlots.${index}.breakMinutes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pausa (minuti)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                max="480"
                                placeholder="30"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                data-testid={`input-break-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Template Summary */}
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Riepilogo:</strong> {fields.length} fasce orarie, 
                    totale {totalHours.toFixed(1)} ore per {totalDays} giorni/settimana
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Days of Week Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Giorni della Settimana</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Seleziona i giorni in cui applicare questo template
                </p>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="daysOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <label
                            key={day.value}
                            className="flex flex-col items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={field.value?.includes(day.value)}
                              onCheckedChange={(checked: boolean) => {
                                const days = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...days, day.value]
                                    : days.filter(d => d !== day.value)
                                );
                              }}
                              data-testid={`checkbox-day-${day.value}`}
                            />
                            <div className="text-center">
                              <div className="font-medium text-sm">{day.label}</div>
                              <div className="text-xs text-muted-foreground">{day.fullName}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Note Aggiuntive</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Note o istruzioni speciali per questo template..."
                          className="min-h-[100px]"
                          data-testid="input-template-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Errors Display */}
            {Object.keys(form.formState.errors).length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errori di validazione:</strong>
                  <ul className="mt-2 space-y-1">
                    {Object.entries(form.formState.errors).map(([key, error]) => (
                      <li key={key} className="text-sm">
                        • {error?.message || 'Errore sconosciuto'}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>

        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={saveTemplateMutation.isPending}
          >
            Annulla
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={saveTemplateMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            data-testid="button-save-template"
          >
            {saveTemplateMutation.isPending ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {template?.id ? 'Aggiorna Template' : 'Crea Template'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}