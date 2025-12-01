import { useState, useCallback, useEffect } from 'react';
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
import { Plus, X, Trash2, Clock, AlertTriangle, CheckCircle, Save, Store as StoreIcon } from 'lucide-react';

// ==================== TYPES & SCHEMAS ====================

const timeSlotSchema = z.object({
  segmentType: z.enum(['continuous', 'split', 'triple', 'quad']).default('continuous'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)'),
  // ✅ Multi-block support (up to 4 blocks)
  block2StartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)').optional(),
  block2EndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)').optional(),
  block3StartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)').optional(),
  block3EndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)').optional(),
  block4StartTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)').optional(),
  block4EndTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)').optional(),
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
  
  // Validate multi-block shifts (split, triple, quad) - all blocks same day, no overnight
  if (data.segmentType !== 'continuous') {
    const blocks: Array<{start: string, end: string, label: string, startPath: string[], endPath: string[]}> = [
      { start: data.startTime, end: data.endTime, label: 'primo', startPath: ['startTime'], endPath: ['endTime'] }
    ];
    
    // Add blocks based on segment type
    if (data.segmentType === 'split' || data.segmentType === 'triple' || data.segmentType === 'quad') {
      if (!data.block2StartTime || !data.block2EndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Il secondo blocco è obbligatorio per fasce ${data.segmentType === 'split' ? 'spezzate' : data.segmentType === 'triple' ? 'triple' : 'quad'}`,
          path: ['block2StartTime']
        });
        return;
      }
      blocks.push({ start: data.block2StartTime, end: data.block2EndTime, label: 'secondo', startPath: ['block2StartTime'], endPath: ['block2EndTime'] });
    }
    
    if (data.segmentType === 'triple' || data.segmentType === 'quad') {
      if (!data.block3StartTime || !data.block3EndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Il terzo blocco è obbligatorio per fasce ${data.segmentType === 'triple' ? 'triple' : 'quad'}`,
          path: ['block3StartTime']
        });
        return;
      }
      blocks.push({ start: data.block3StartTime, end: data.block3EndTime, label: 'terzo', startPath: ['block3StartTime'], endPath: ['block3EndTime'] });
    }
    
    if (data.segmentType === 'quad') {
      if (!data.block4StartTime || !data.block4EndTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Il quarto blocco è obbligatorio per fasce quad',
          path: ['block4StartTime']
        });
        return;
      }
      blocks.push({ start: data.block4StartTime, end: data.block4EndTime, label: 'quarto', startPath: ['block4StartTime'], endPath: ['block4EndTime'] });
    }
    
    // Validate each block
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockStart = new Date(`2000-01-01T${block.start}`);
      const blockEnd = new Date(`2000-01-01T${block.end}`);
      
      // Block cannot span overnight in multi-block shifts
      if (blockEnd <= blockStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Il ${block.label} blocco non può attraversare la mezzanotte`,
          path: block.endPath
        });
        continue;
      }
      
      // Validate block duration (min 1h, max 16h)
      const blockHours = (blockEnd.getTime() - blockStart.getTime()) / (1000 * 60 * 60);
      if (blockHours < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Il ${block.label} blocco deve durare almeno 1 ora`,
          path: block.endPath
        });
      } else if (blockHours > 16) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Il ${block.label} blocco non può superare 16 ore`,
          path: block.endPath
        });
      }
      
      // Validate that each block starts after the previous one ends (with break)
      if (i > 0) {
        const prevBlock = blocks[i - 1];
        const prevBlockEnd = new Date(`2000-01-01T${prevBlock.end}`);
        if (blockStart.getTime() <= prevBlockEnd.getTime()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Il ${block.label} blocco deve iniziare dopo la fine del ${prevBlock.label} blocco (con pausa)`,
            path: block.startPath
          });
        }
      }
    }
  }
});

const shiftTemplateSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve avere almeno 3 caratteri')
    .max(50, 'Nome troppo lungo (max 50 caratteri)'),
  description: z.string().max(200, 'Descrizione troppo lunga (max 200 caratteri)').optional(),
  storeId: z.string().default('global'), // 'global' = valido per tutti i punti vendita
  status: z.enum(['active', 'archived']).default('active'),
  // ✅ NEW: Shift type selection
  shiftType: z.enum(['slot_based', 'split_shift']).default('slot_based'),
  // ✅ NEW: Global tolerances (used only for split_shift type)
  globalClockInTolerance: z.number().min(0).max(60).optional(),
  globalClockOutTolerance: z.number().min(0).max(60).optional(),
  globalBreakMinutes: z.number().min(0).max(480).optional(),
  timeSlots: z.array(timeSlotSchema)
    .min(1, 'Almeno una fascia oraria richiesta')
    .max(5, 'Massimo 5 fasce orarie per template'),
  // ❌ REMOVED: daysOfWeek no longer needed (decided during assignment)
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().max(500, 'Note troppo lunghe (max 500 caratteri)').optional()
}).superRefine((data, ctx) => {
  // Validate global tolerances for split_shift type
  if (data.shiftType === 'split_shift') {
    if (data.globalClockInTolerance === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tolleranza clock-in obbligatoria per turnazione spezzata',
        path: ['globalClockInTolerance']
      });
    }
    if (data.globalClockOutTolerance === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tolleranza clock-out obbligatoria per turnazione spezzata',
        path: ['globalClockOutTolerance']
      });
    }
    if (data.globalBreakMinutes === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pausa obbligatoria per turnazione spezzata',
        path: ['globalBreakMinutes']
      });
    }
  }
  
  // Business Logic Validation: Check for overlapping time slots (including split shift blocks)
  // Uses minute-based, 24h-cycle aware algorithm to handle overnight shifts correctly
  
  // Convert HH:MM to minutes since midnight (0-1439)
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Convert a time block to interval(s) - overnight blocks become two intervals
  const getIntervals = (startTime: string, endTime: string, isOvernight: boolean): Array<{start: number, end: number}> => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    
    if (isOvernight && end <= start) {
      // Split into two intervals: [start, 1440) and [0, end)
      return [
        { start, end: 1440 },
        { start: 0, end }
      ];
    }
    
    return [{ start, end }];
  };
  
  // Check if two intervals overlap (strict: touching at endpoints is NOT overlap)
  const intervalsOverlap = (a: {start: number, end: number}, b: {start: number, end: number}): boolean => {
    return a.start < b.end && b.start < a.end;
  };
  
  for (let i = 0; i < data.timeSlots.length; i++) {
    for (let j = i + 1; j < data.timeSlots.length; j++) {
      const slot1 = data.timeSlots[i];
      const slot2 = data.timeSlots[j];
      
      // Collect all time blocks for slot1 with their intervals
      const slot1Blocks: Array<{intervals: Array<{start: number, end: number}>, label: string}> = [];
      
      const isSlot1Overnight = slot1.segmentType === 'continuous' && 
                               timeToMinutes(slot1.endTime) <= timeToMinutes(slot1.startTime);
      slot1Blocks.push({
        intervals: getIntervals(slot1.startTime, slot1.endTime, isSlot1Overnight),
        label: 'primo blocco'
      });
      
      // Add additional blocks for multi-block shifts (cannot be overnight by definition)
      if ((slot1.segmentType === 'split' || slot1.segmentType === 'triple' || slot1.segmentType === 'quad') && 
          slot1.block2StartTime && slot1.block2EndTime) {
        slot1Blocks.push({
          intervals: getIntervals(slot1.block2StartTime, slot1.block2EndTime, false),
          label: 'secondo blocco'
        });
      }
      
      if ((slot1.segmentType === 'triple' || slot1.segmentType === 'quad') && 
          slot1.block3StartTime && slot1.block3EndTime) {
        slot1Blocks.push({
          intervals: getIntervals(slot1.block3StartTime, slot1.block3EndTime, false),
          label: 'terzo blocco'
        });
      }
      
      if (slot1.segmentType === 'quad' && slot1.block4StartTime && slot1.block4EndTime) {
        slot1Blocks.push({
          intervals: getIntervals(slot1.block4StartTime, slot1.block4EndTime, false),
          label: 'quarto blocco'
        });
      }
      
      // Collect all time blocks for slot2 with their intervals
      const slot2Blocks: Array<{intervals: Array<{start: number, end: number}>, label: string}> = [];
      
      const isSlot2Overnight = slot2.segmentType === 'continuous' && 
                               timeToMinutes(slot2.endTime) <= timeToMinutes(slot2.startTime);
      slot2Blocks.push({
        intervals: getIntervals(slot2.startTime, slot2.endTime, isSlot2Overnight),
        label: 'primo blocco'
      });
      
      // Add additional blocks for multi-block shifts
      if ((slot2.segmentType === 'split' || slot2.segmentType === 'triple' || slot2.segmentType === 'quad') && 
          slot2.block2StartTime && slot2.block2EndTime) {
        slot2Blocks.push({
          intervals: getIntervals(slot2.block2StartTime, slot2.block2EndTime, false),
          label: 'secondo blocco'
        });
      }
      
      if ((slot2.segmentType === 'triple' || slot2.segmentType === 'quad') && 
          slot2.block3StartTime && slot2.block3EndTime) {
        slot2Blocks.push({
          intervals: getIntervals(slot2.block3StartTime, slot2.block3EndTime, false),
          label: 'terzo blocco'
        });
      }
      
      if (slot2.segmentType === 'quad' && slot2.block4StartTime && slot2.block4EndTime) {
        slot2Blocks.push({
          intervals: getIntervals(slot2.block4StartTime, slot2.block4EndTime, false),
          label: 'quarto blocco'
        });
      }
      
      // Check all combinations of blocks and their intervals
      for (const block1 of slot1Blocks) {
        for (const block2 of slot2Blocks) {
          // Check each interval of block1 against each interval of block2
          for (const interval1 of block1.intervals) {
            for (const interval2 of block2.intervals) {
              if (intervalsOverlap(interval1, interval2)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Sovrapposizione tra fascia ${i + 1} (${block1.label}) e fascia ${j + 1} (${block2.label})`,
                  path: ['timeSlots', i, 'startTime']
                });
                // Exit early once overlap is found for this block pair
                return;
              }
            }
          }
        }
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
  mode?: 'create' | 'edit' | 'duplicate';
}

export default function ShiftTemplateModal({ isOpen, onClose, template, mode = 'create' }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch stores for dropdown (uses default fetcher with apiRequest for auth headers)
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['/api/stores']
  });
  
  // Initialize form with default values (MUST be before form.watch!)
  const form = useForm<ShiftTemplateFormData>({
    resolver: zodResolver(shiftTemplateSchema),
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      storeId: template?.storeId || 'global', // Default: valido per tutti i punti vendita
      status: template?.status || 'active',
      // ✅ NEW: Shift type defaults
      shiftType: template?.shiftType || 'slot_based',
      globalClockInTolerance: template?.globalClockInTolerance || 15,
      globalClockOutTolerance: template?.globalClockOutTolerance || 15,
      globalBreakMinutes: template?.globalBreakMinutes || 30,
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

  // Track active block count for each time slot (1-4)
  const [blockCounts, setBlockCounts] = useState<Record<number, number>>({});

  // ✅ FIX: Reset form when template changes (edit mode)
  // useForm's defaultValues only apply on first mount, so we need to reset when switching templates
  useEffect(() => {
    if (template?.id && (mode === 'edit' || mode === 'duplicate')) {
      // Editing or duplicating existing template - populate form with template data
      // For duplicate mode, add "(Copia)" suffix to name
      const templateName = mode === 'duplicate' 
        ? `${template.name || ''} (Copia)`
        : template.name || '';
      
      form.reset({
        name: templateName,
        description: template.description || '',
        storeId: template.storeId || 'global',
        status: template.status || 'active',
        shiftType: template.shiftType || 'slot_based',
        globalClockInTolerance: template.globalClockInTolerance || 15,
        globalClockOutTolerance: template.globalClockOutTolerance || 15,
        globalBreakMinutes: template.globalBreakMinutes || 30,
        timeSlots: template.timeSlots || (template.defaultStartTime ? [
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
        color: template.color || '#FF6900',
        isActive: template.isActive ?? true,
        notes: template.notes || ''
      });
      setBlockCounts({}); // Reset block counts for new template
    } else if (mode === 'create') {
      // Creating new template - reset to defaults
      form.reset({
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
      });
      setBlockCounts({});
    }
  }, [template?.id, mode, form]);

  // Dynamic time slots management
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'timeSlots'
  });

  // ✅ NEW: Watch shift type to conditionally show/hide fields
  const shiftType = form.watch('shiftType');

  // Create/Update mutation - mode-aware
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: ShiftTemplateFormData) => {
      // Determine endpoint and method based on mode
      // - create: POST to /api/hr/shift-templates
      // - edit: PUT to /api/hr/shift-templates/:id (creates new version via backend versioning)
      // - duplicate: POST to /api/hr/shift-templates (creates new record)
      const isEditMode = mode === 'edit' && template?.id;
      const isDuplicateMode = mode === 'duplicate';
      
      const endpoint = isEditMode 
        ? `/api/hr/shift-templates/${template.id}` 
        : '/api/hr/shift-templates';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // For duplicate mode, ensure name has "(Copia)" suffix
      let templateName = data.name;
      if (isDuplicateMode && !templateName.includes('(Copia)')) {
        templateName = `${templateName} (Copia)`;
      }
      
      // Enterprise format with multiple timeSlots support
      // 'global' = null (valido per tutti i punti vendita)
      const enterpriseData = {
        name: templateName,
        description: data.description,
        storeId: data.storeId === 'global' ? null : data.storeId,
        scope: data.storeId === 'global' ? 'global' : 'store', // Scope per filtro backend
        status: data.status,
        // ✅ NEW: Shift type and global tolerances
        shiftType: data.shiftType,
        globalClockInTolerance: data.globalClockInTolerance,
        globalClockOutTolerance: data.globalClockOutTolerance,
        globalBreakMinutes: data.globalBreakMinutes,
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
      
      // Mode-specific success messages
      const successMessages = {
        create: { title: "Template Creato", desc: "Il nuovo template turni è stato creato con successo" },
        edit: { title: "Template Aggiornato", desc: "È stata creata una nuova versione del template. I turni futuri sono stati aggiornati." },
        duplicate: { title: "Template Duplicato", desc: "Il template è stato copiato con successo" }
      };
      
      const { title, desc } = successMessages[mode];
      toast({ title, description: desc });
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
      const tenantId = localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001';
      const response = await fetch(`/api/hr/shift-templates/${template.id}/verify-coverage?storeId=${selectedStoreId}`, {
        credentials: 'include',
        headers: {
          'X-Tenant-ID': tenantId,
          'X-Auth-Session': 'authenticated',
          'X-Demo-User': 'admin-user'
        }
      });
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
    // Remove block count tracking for this slot
    setBlockCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[index];
      // Reindex remaining slots
      const reindexed: Record<number, number> = {};
      Object.keys(newCounts).forEach((key) => {
        const keyNum = parseInt(key);
        if (keyNum > index) {
          reindexed[keyNum - 1] = newCounts[keyNum];
        } else if (keyNum < index) {
          reindexed[keyNum] = newCounts[keyNum];
        }
      });
      return reindexed;
    });
  };

  // Add a block to a time slot (up to 4 blocks total)
  const addBlock = (slotIndex: number) => {
    const currentCount = blockCounts[slotIndex] || 1;
    if (currentCount >= 4) {
      toast({
        title: "Limite Raggiunto",
        description: "Massimo 4 blocchi per fascia oraria",
        variant: "destructive"
      });
      return;
    }
    
    const newCount = currentCount + 1;
    setBlockCounts((prev) => ({
      ...prev,
      [slotIndex]: newCount
    }));
    
    // Update segmentType automatically based on block count
    const segmentTypeMap: Record<number, 'continuous' | 'split' | 'triple' | 'quad'> = {
      1: 'continuous',
      2: 'split',
      3: 'triple',
      4: 'quad'
    };
    form.setValue(`timeSlots.${slotIndex}.segmentType`, segmentTypeMap[newCount]);
  };

  // Remove a block from a time slot (minimum 1 block)
  const removeBlock = (slotIndex: number, blockNumber: number) => {
    const currentCount = blockCounts[slotIndex] || 1;
    if (currentCount <= 1) {
      toast({
        title: "Operazione Non Consentita",
        description: "Almeno un blocco è richiesto",
        variant: "destructive"
      });
      return;
    }
    
    // Clear the block fields being removed
    if (blockNumber === 2) {
      form.setValue(`timeSlots.${slotIndex}.block2StartTime`, undefined);
      form.setValue(`timeSlots.${slotIndex}.block2EndTime`, undefined);
    } else if (blockNumber === 3) {
      form.setValue(`timeSlots.${slotIndex}.block3StartTime`, undefined);
      form.setValue(`timeSlots.${slotIndex}.block3EndTime`, undefined);
    } else if (blockNumber === 4) {
      form.setValue(`timeSlots.${slotIndex}.block4StartTime`, undefined);
      form.setValue(`timeSlots.${slotIndex}.block4EndTime`, undefined);
    }
    
    const newCount = currentCount - 1;
    setBlockCounts((prev) => ({
      ...prev,
      [slotIndex]: newCount
    }));
    
    // Update segmentType automatically based on block count
    const segmentTypeMap: Record<number, 'continuous' | 'split' | 'triple' | 'quad'> = {
      1: 'continuous',
      2: 'split',
      3: 'triple',
      4: 'quad'
    };
    form.setValue(`timeSlots.${slotIndex}.segmentType`, segmentTypeMap[newCount]);
  };

  // Get the number of active blocks for a slot
  const getBlockCount = (slotIndex: number) => {
    return blockCounts[slotIndex] || 1;
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

  // FIX: Generate stable key to force clean remount when switching between templates
  const dialogKey = `shift-template-modal-${template?.id ?? 'new'}`;

  return (
    <Dialog key={dialogKey} open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            {mode === 'edit' ? 'Modifica Template Turni' : mode === 'duplicate' ? 'Duplica Template Turni' : 'Nuovo Template Turni'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modifica le impostazioni del template. Verrà creata una nuova versione e i turni futuri saranno aggiornati.'
              : mode === 'duplicate'
              ? 'Crea una copia del template selezionato con un nuovo nome'
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
                          Ambito Applicazione
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
                          <SelectContent container={null}>
                            <SelectItem value="global" className="font-semibold text-orange-600">
                              🌐 Tutti i Punti Vendita (Globale)
                            </SelectItem>
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

                  {/* ✅ NEW: Shift Type Selection */}
                  <FormField
                    control={form.control}
                    name="shiftType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Turnazione *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-3 pt-2"
                          >
                            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <RadioGroupItem value="slot_based" id="shift-type-slot" data-testid="radio-shift-type-slot" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="shift-type-slot" className="cursor-pointer font-medium">
                                  Turnazione a Fascia
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Ogni fascia oraria è un turno separato con proprie tolleranze e pausa
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <RadioGroupItem value="split_shift" id="shift-type-split" data-testid="radio-shift-type-split" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="shift-type-split" className="cursor-pointer font-medium">
                                  Turnazione Spezzata
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Tutte le fasce insieme formano 1 unico turno con tolleranze e pausa globali
                                </p>
                              </div>
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

            {/* ✅ NEW: Global Tolerances Section (only for split_shift) */}
            {shiftType === 'split_shift' && (
              <Card className="border-orange-200 bg-orange-50/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Tolleranze Globali (Turno Unico)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Queste tolleranze e pausa si applicano all'intero turno spezzato
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="globalClockInTolerance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tolleranza Clock-In (minuti) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="60"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-global-clock-in-tolerance"
                            />
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
                          <FormLabel>Tolleranza Clock-Out (minuti) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="60"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-global-clock-out-tolerance"
                            />
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
                          <FormLabel>Pausa (minuti) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="480"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-global-break-minutes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Alert className="mt-4 bg-blue-50 border-blue-200">
                    <AlertDescription className="text-sm text-blue-800">
                      <strong>Esempio:</strong> Se crei fasce 09:00-13:00 e 14:00-18:00, il dipendente fa clock-in solo all'inizio (09:00) e clock-out solo alla fine (18:00). La pausa si applica una volta sola.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

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
                    
                    {/* Dynamic Blocks - First Block (always visible) */}
                    <div className="mb-3 pb-3 border-b">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-muted-foreground">Blocco 1</Label>
                      </div>
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
                    
                    {/* Second Block (dynamic) */}
                    {getBlockCount(index) >= 2 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">Blocco 2</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlock(index, 2)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                            data-testid={`button-remove-block2-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
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
                    
                    {/* Third Block (dynamic) */}
                    {getBlockCount(index) >= 3 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">Blocco 3</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlock(index, 3)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                            data-testid={`button-remove-block3-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block3StartTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ora Inizio Blocco 3</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="time"
                                    data-testid={`input-block3-start-time-${index}`}
                                  />
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
                                <FormLabel>Ora Fine Blocco 3</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="time"
                                    data-testid={`input-block3-end-time-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Fourth Block (dynamic) */}
                    {getBlockCount(index) >= 4 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">Blocco 4</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBlock(index, 4)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                            data-testid={`button-remove-block4-${index}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`timeSlots.${index}.block4StartTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Ora Inizio Blocco 4</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="time"
                                    data-testid={`input-block4-start-time-${index}`}
                                  />
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
                                <FormLabel>Ora Fine Blocco 4</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="time"
                                    data-testid={`input-block4-end-time-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Add Block Button */}
                    {getBlockCount(index) < 4 && (
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock(index)}
                          className="w-full"
                          data-testid={`button-add-block-${index}`}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Aggiungi Blocco
                        </Button>
                      </div>
                    )}
                    
                    {/* ✅ Pausa e Tolleranze (SOLO per turnazione a fascia) */}
                    {shiftType === 'slot_based' ? (
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
                    ) : (
                      <div className="mt-4 pt-4 border-t">
                        <Alert className="bg-blue-50 border-blue-200">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-sm text-blue-800">
                            <strong>Turnazione Spezzata:</strong> Le tolleranze e la pausa sono configurate nelle <strong>Tolleranze Globali</strong> sopra e si applicano all'intero turno.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
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
                {mode === 'edit' ? 'Aggiorna Template' : mode === 'duplicate' ? 'Duplica Template' : 'Crea Template'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}