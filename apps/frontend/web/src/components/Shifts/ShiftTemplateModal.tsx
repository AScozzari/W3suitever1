import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import { Plus, Trash2, Clock, AlertTriangle, CheckCircle, Save, Store as StoreIcon } from 'lucide-react';

// ==================== TYPES & SCHEMAS ====================

const timeSlotSchema = z.object({
  segmentType: z.enum(['continuous', 'split']).default('continuous'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)'),
  // ✅ NEW: For split shifts
  block2StartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)').optional(),
  block2EndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)').optional(),
  breakMinutes: z.number().min(0, 'Pausa non può essere negativa').max(480, 'Pausa troppo lunga (max 8h)').optional(),
  clockInToleranceMinutes: z.number().min(0, 'Tolleranza non può essere negativa').max(60, 'Tolleranza massima 60 minuti').optional(),
  clockOutToleranceMinutes: z.number().min(0, 'Tolleranza non può essere negativa').max(60, 'Tolleranza massima 60 minuti').optional()
}).superRefine((data, ctx) => {
  // Validate continuous shifts (allow overnight spans like 22:00-06:00)
  if (data.segmentType === 'continuous') {
    const start = new Date(`2000-01-01T${data.startTime}`);
    let end = new Date(`2000-01-01T${data.endTime}`);
    
    // Handle overnight shifts
    if (end <= start) {
      end = new Date(`2000-01-02T${data.endTime}`);
    }
    
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fascia deve durare almeno 1 ora',
        path: ['endTime']
      });
    } else if (diffHours > 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fascia non può superare 16 ore',
        path: ['endTime']
      });
    }
  }
  
  // Validate split shifts - both blocks same day, no overnight
  if (data.segmentType === 'split') {
    if (!data.block2StartTime || !data.block2EndTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Entrambi i blocchi sono obbligatori per una fascia spezzata',
        path: ['block2StartTime']
      });
      return;
    }
    
    // Parse all times (same day - no overnight for split shifts)
    const block1Start = new Date(`2000-01-01T${data.startTime}`);
    const block1End = new Date(`2000-01-01T${data.endTime}`);
    const block2Start = new Date(`2000-01-01T${data.block2StartTime}`);
    const block2End = new Date(`2000-01-01T${data.block2EndTime}`);
    
    // Block 1 cannot span overnight in split shifts
    if (block1End <= block1Start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Il primo blocco non può attraversare la mezzanotte nelle fasce spezzate',
        path: ['endTime']
      });
    }
    
    // Block 2 cannot span overnight in split shifts
    if (block2End <= block2Start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Il secondo blocco non può attraversare la mezzanotte nelle fasce spezzate',
        path: ['block2EndTime']
      });
    }
    
    // Validate Block 1 duration (min 1h, max 16h, same day)
    const block1Hours = (block1End.getTime() - block1Start.getTime()) / (1000 * 60 * 60);
    if (block1Hours < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Il primo blocco deve durare almeno 1 ora',
        path: ['endTime']
      });
    } else if (block1Hours > 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Il primo blocco non può superare 16 ore',
        path: ['endTime']
      });
    }
    
    // Validate Block 2 duration (min 1h, max 16h, same day)
    const block2Hours = (block2End.getTime() - block2Start.getTime()) / (1000 * 60 * 60);
    if (block2Hours < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Il secondo blocco deve durare almeno 1 ora',
        path: ['block2EndTime']
      });
    } else if (block2Hours > 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Il secondo blocco non può superare 16 ore',
        path: ['block2EndTime']
      });
    }
    
    // Validate Block 2 starts after Block 1 ends (same day, minimum break enforced)
    if (block2Start.getTime() <= block1End.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Il secondo blocco deve iniziare dopo la fine del primo blocco (con pausa)',
        path: ['block2StartTime']
      });
    }
  }
});

const shiftTemplateSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve avere almeno 3 caratteri')
    .max(50, 'Nome troppo lungo (max 50 caratteri)'),
  description: z.string().max(200, 'Descrizione troppo lunga (max 200 caratteri)').optional(),
  storeId: z.string().min(1, 'Seleziona un punto vendita'),
  status: z.enum(['active', 'archived']).default('active'),
  timeSlots: z.array(timeSlotSchema)
    .min(1, 'Almeno una fascia oraria richiesta')
    .max(5, 'Massimo 5 fasce orarie per template'),
  // ❌ REMOVED: daysOfWeek no longer needed (decided during assignment)
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
  
  // Fetch stores for dropdown
  const { data: stores, isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores'],
    queryFn: async () => {
      const response = await fetch('/api/stores');
      if (!response.ok) return [];
      return response.json();
    }
  });
  
  // Initialize form with default values (MUST be before form.watch!)
  const form = useForm<ShiftTemplateFormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      storeId: template?.storeId || '',
      status: template?.status || 'active',
      // Map legacy format to new format for editing
      timeSlots: template?.timeSlots || (template?.defaultStartTime ? [
        { 
          segmentType: 'continuous',
          startTime: template.defaultStartTime, 
          endTime: template.defaultEndTime, 
          breakMinutes: template.defaultBreakMinutes || 30,
          clockInToleranceMinutes: template.clockInToleranceMinutes || 15,
          clockOutToleranceMinutes: template.clockOutToleranceMinutes || 15
        }
      ] : [
        { segmentType: 'continuous', startTime: '09:00', endTime: '17:00', breakMinutes: 30, clockInToleranceMinutes: 15, clockOutToleranceMinutes: 15 }
      ]),
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
        storeId: data.storeId,
        status: data.status,
        pattern: 'weekly', // Default pattern
        defaultStartTime: data.timeSlots[0]?.startTime || '09:00',
        defaultEndTime: data.timeSlots[0]?.endTime || '17:00',
        defaultRequiredStaff: 2, // Default staff
        defaultBreakMinutes: data.timeSlots[0]?.breakMinutes || 30,
        clockInToleranceMinutes: data.timeSlots[0]?.clockInToleranceMinutes || 15,
        clockOutToleranceMinutes: data.timeSlots[0]?.clockOutToleranceMinutes || 15,
        isActive: data.isActive,
        notes: data.notes,
        color: data.color,
        timeSlots: data.timeSlots // ✅ Now sending full timeSlots array to backend (includes tolerances)
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

  // Watch storeId for coverage verification (AFTER form initialization, ONLY in edit mode)
  const selectedStoreId = template?.id ? form.watch('storeId') : null;
  
  // Fetch coverage verification when store is selected (ONLY for editing existing templates)
  const { data: coverage, isLoading: coverageLoading } = useQuery({
    queryKey: template?.id ? ['/api/hr/shift-templates', template.id, 'verify-coverage', selectedStoreId] : ['coverage-disabled'],
    queryFn: async () => {
      if (!template?.id || !selectedStoreId) return null;
      const response = await fetch(`/api/hr/shift-templates/${template.id}/verify-coverage?storeId=${selectedStoreId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!template?.id && !!selectedStoreId
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
    
    append({ segmentType: 'continuous', startTime: '09:00', endTime: '17:00', breakMinutes: 30, clockInToleranceMinutes: 15, clockOutToleranceMinutes: 15 });
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
  const watchedColor = form.watch('color');
  
  const totalHours = calculateTotalHours(watchedTimeSlots || []);

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <StoreIcon className="w-4 h-4" />
                          Punto Vendita *
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={storesLoading}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-template-store">
                              <SelectValue placeholder="Seleziona punto vendita" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stores?.map((store: any) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.nome || store.name} - {store.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Coverage Verification Badge */}
                        {template?.id && selectedStoreId && coverage && !coverageLoading && (
                          <div className="mt-2">
                            {coverage.sufficient ? (
                              <Badge 
                                variant="outline" 
                                className="bg-green-50 text-green-700 border-green-200"
                                data-testid="badge-coverage-sufficient"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {coverage.available} {coverage.available === 1 ? 'risorsa disponibile' : 'risorse disponibili'}
                              </Badge>
                            ) : (
                              <Badge 
                                variant="outline" 
                                className="bg-amber-50 text-amber-700 border-amber-200"
                                data-testid="badge-coverage-insufficient"
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Solo {coverage.available} {coverage.available === 1 ? 'risorsa' : 'risorse'}, ne {coverage.required === 1 ? 'serve' : 'servono'} {coverage.required}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stato Template</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex gap-4 pt-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="active" id="status-active" data-testid="radio-status-active" />
                              <Label htmlFor="status-active" className="cursor-pointer">Attivo</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="archived" id="status-archived" data-testid="radio-status-archived" />
                              <Label htmlFor="status-archived" className="cursor-pointer">Archiviato</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                {fields.map((field, index) => {
                  const segmentType = form.watch(`timeSlots.${index}.segmentType`);
                  
                  return (
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
                    
                    {/* ✅ NEW: Segment Type Selection */}
                    <FormField
                      control={form.control}
                      name={`timeSlots.${index}.segmentType`}
                      render={({ field }) => (
                        <FormItem className="mb-4">
                          <FormLabel>Tipo Fascia</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Clear block2 fields when switching back to continuous
                                if (value === 'continuous') {
                                  form.setValue(`timeSlots.${index}.block2StartTime`, undefined);
                                  form.setValue(`timeSlots.${index}.block2EndTime`, undefined);
                                }
                              }}
                              value={field.value}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="continuous" id={`continuous-${index}`} data-testid={`radio-continuous-${index}`} />
                                <Label htmlFor={`continuous-${index}`} className="cursor-pointer font-normal">
                                  Continua
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="split" id={`split-${index}`} data-testid={`radio-split-${index}`} />
                                <Label htmlFor={`split-${index}`} className="cursor-pointer font-normal">
                                  Spezzata
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* First Block (always visible) */}
                    <div className={cn("mb-3", segmentType === 'split' && "pb-3 border-b")}>
                      {segmentType === 'split' && (
                        <Label className="text-xs text-muted-foreground mb-2 block">Primo Blocco</Label>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>
                    </div>
                    
                    {/* ✅ NEW: Second Block (only for split shifts) */}
                    {segmentType === 'split' && (
                      <div className="mt-4 pt-4 border-t">
                        <Label className="text-xs text-muted-foreground mb-2 block">Secondo Blocco</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block2StartTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ora Inizio Blocco 2</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="time"
                                    data-testid={`input-block2-start-time-${index}`}
                                  />
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
                                <FormLabel>Ora Fine Blocco 2</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="time"
                                    data-testid={`input-block2-end-time-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Pausa e Tolleranze (alla fine per entrambi i tipi) */}
                    <div className="mt-4 pt-4 border-t space-y-4">
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`timeSlots.${index}.clockInToleranceMinutes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tolleranza Clock-In (minuti)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  max="60"
                                  placeholder="15"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid={`input-clockin-tolerance-${index}`}
                                />
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
                              <FormLabel>Tolleranza Clock-Out (minuti)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min="0"
                                  max="60"
                                  placeholder="15"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid={`input-clockout-tolerance-${index}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
                
                {/* Template Summary */}
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Riepilogo:</strong> {fields.length} {fields.length === 1 ? 'fascia oraria' : 'fasce orarie'}, 
                    totale {totalHours.toFixed(1)} ore
                  </AlertDescription>
                </Alert>
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

            {/* Coverage Warning */}
            {template?.id && coverage && !coverage.sufficient && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Copertura risorse insufficiente:</strong> Il punto vendita selezionato ha solo {coverage.available} {coverage.available === 1 ? 'risorsa disponibile' : 'risorse disponibili'}, ma il template richiede {coverage.required} {coverage.required === 1 ? 'risorsa' : 'risorse'}. 
                  Non è possibile salvare il template finché non vengono assegnate più risorse al punto vendita.
                </AlertDescription>
              </Alert>
            )}

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
            disabled={saveTemplateMutation.isPending || (template?.id && coverage && !coverage.sufficient)}
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