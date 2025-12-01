import { z } from 'zod';

export const timeSlotSchema = z.object({
  segmentType: z.enum(['continuous', 'split', 'triple', 'quad']).default('continuous'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato orario non valido (HH:MM)'),
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
  if (data.segmentType === 'continuous') {
    const start = new Date(`2000-01-01T${data.startTime}`);
    let end = new Date(`2000-01-01T${data.endTime}`);
    if (end <= start) end = new Date(`2000-01-02T${data.endTime}`);
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fascia deve durare almeno 1 ora', path: ['endTime'] });
    else if (diffHours > 16) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'La fascia non può superare 16 ore', path: ['endTime'] });
  }
  
  if (data.segmentType !== 'continuous') {
    const blocks: Array<{start: string, end: string, label: string, startPath: string[], endPath: string[]}> = [
      { start: data.startTime, end: data.endTime, label: 'primo', startPath: ['startTime'], endPath: ['endTime'] }
    ];
    
    if (data.segmentType === 'split' || data.segmentType === 'triple' || data.segmentType === 'quad') {
      if (!data.block2StartTime || !data.block2EndTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Il secondo blocco è obbligatorio`, path: ['block2StartTime'] });
        return;
      }
      blocks.push({ start: data.block2StartTime, end: data.block2EndTime, label: 'secondo', startPath: ['block2StartTime'], endPath: ['block2EndTime'] });
    }
    
    if (data.segmentType === 'triple' || data.segmentType === 'quad') {
      if (!data.block3StartTime || !data.block3EndTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Il terzo blocco è obbligatorio`, path: ['block3StartTime'] });
        return;
      }
      blocks.push({ start: data.block3StartTime, end: data.block3EndTime, label: 'terzo', startPath: ['block3StartTime'], endPath: ['block3EndTime'] });
    }
    
    if (data.segmentType === 'quad') {
      if (!data.block4StartTime || !data.block4EndTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Il quarto blocco è obbligatorio', path: ['block4StartTime'] });
        return;
      }
      blocks.push({ start: data.block4StartTime, end: data.block4EndTime, label: 'quarto', startPath: ['block4StartTime'], endPath: ['block4EndTime'] });
    }
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockStart = new Date(`2000-01-01T${block.start}`);
      const blockEnd = new Date(`2000-01-01T${block.end}`);
      
      if (blockEnd <= blockStart) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Il ${block.label} blocco non può attraversare la mezzanotte`, path: block.endPath });
        continue;
      }
      
      const blockHours = (blockEnd.getTime() - blockStart.getTime()) / (1000 * 60 * 60);
      if (blockHours < 1) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Il ${block.label} blocco deve durare almeno 1 ora`, path: block.endPath });
      else if (blockHours > 16) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Il ${block.label} blocco non può superare 16 ore`, path: block.endPath });
      
      if (i > 0) {
        const prevBlock = blocks[i - 1];
        const prevBlockEnd = new Date(`2000-01-01T${prevBlock.end}`);
        if (blockStart.getTime() <= prevBlockEnd.getTime()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Il ${block.label} blocco deve iniziare dopo il ${prevBlock.label}`, path: block.startPath });
        }
      }
    }
  }
});

export const shiftTemplateSchema = z.object({
  name: z.string().min(3, 'Nome deve avere almeno 3 caratteri').max(50, 'Nome troppo lungo (max 50 caratteri)'),
  description: z.string().max(200, 'Descrizione troppo lunga (max 200 caratteri)').optional(),
  storeId: z.string().default('global'),
  status: z.enum(['active', 'archived']).default('active'),
  shiftType: z.enum(['slot_based', 'split_shift']).default('slot_based'),
  globalClockInTolerance: z.number().min(0).max(60).optional(),
  globalClockOutTolerance: z.number().min(0).max(60).optional(),
  globalBreakMinutes: z.number().min(0).max(480).optional(),
  timeSlots: z.array(timeSlotSchema).min(1, 'Almeno una fascia oraria richiesta').max(5, 'Massimo 5 fasce orarie per template'),
  color: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().max(500, 'Note troppo lunghe (max 500 caratteri)').optional()
}).superRefine((data, ctx) => {
  if (data.shiftType === 'split_shift') {
    if (data.globalClockInTolerance === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tolleranza clock-in obbligatoria per turnazione spezzata', path: ['globalClockInTolerance'] });
    if (data.globalClockOutTolerance === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tolleranza clock-out obbligatoria per turnazione spezzata', path: ['globalClockOutTolerance'] });
    if (data.globalBreakMinutes === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Pausa obbligatoria per turnazione spezzata', path: ['globalBreakMinutes'] });
  }
  
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const getIntervals = (startTime: string, endTime: string, isOvernight: boolean): Array<{start: number, end: number}> => {
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (isOvernight && end <= start) return [{ start, end: 1440 }, { start: 0, end }];
    return [{ start, end }];
  };
  
  const intervalsOverlap = (a: {start: number, end: number}, b: {start: number, end: number}): boolean => {
    return a.start < b.end && b.start < a.end;
  };
  
  for (let i = 0; i < data.timeSlots.length; i++) {
    for (let j = i + 1; j < data.timeSlots.length; j++) {
      const slot1 = data.timeSlots[i];
      const slot2 = data.timeSlots[j];
      
      const slot1Blocks: Array<{intervals: Array<{start: number, end: number}>}> = [];
      const isSlot1Overnight = slot1.segmentType === 'continuous' && timeToMinutes(slot1.endTime) <= timeToMinutes(slot1.startTime);
      slot1Blocks.push({ intervals: getIntervals(slot1.startTime, slot1.endTime, isSlot1Overnight) });
      
      if ((slot1.segmentType === 'split' || slot1.segmentType === 'triple' || slot1.segmentType === 'quad') && slot1.block2StartTime && slot1.block2EndTime)
        slot1Blocks.push({ intervals: getIntervals(slot1.block2StartTime, slot1.block2EndTime, false) });
      if ((slot1.segmentType === 'triple' || slot1.segmentType === 'quad') && slot1.block3StartTime && slot1.block3EndTime)
        slot1Blocks.push({ intervals: getIntervals(slot1.block3StartTime, slot1.block3EndTime, false) });
      if (slot1.segmentType === 'quad' && slot1.block4StartTime && slot1.block4EndTime)
        slot1Blocks.push({ intervals: getIntervals(slot1.block4StartTime, slot1.block4EndTime, false) });
      
      const slot2Blocks: Array<{intervals: Array<{start: number, end: number}>}> = [];
      const isSlot2Overnight = slot2.segmentType === 'continuous' && timeToMinutes(slot2.endTime) <= timeToMinutes(slot2.startTime);
      slot2Blocks.push({ intervals: getIntervals(slot2.startTime, slot2.endTime, isSlot2Overnight) });
      
      if ((slot2.segmentType === 'split' || slot2.segmentType === 'triple' || slot2.segmentType === 'quad') && slot2.block2StartTime && slot2.block2EndTime)
        slot2Blocks.push({ intervals: getIntervals(slot2.block2StartTime, slot2.block2EndTime, false) });
      if ((slot2.segmentType === 'triple' || slot2.segmentType === 'quad') && slot2.block3StartTime && slot2.block3EndTime)
        slot2Blocks.push({ intervals: getIntervals(slot2.block3StartTime, slot2.block3EndTime, false) });
      if (slot2.segmentType === 'quad' && slot2.block4StartTime && slot2.block4EndTime)
        slot2Blocks.push({ intervals: getIntervals(slot2.block4StartTime, slot2.block4EndTime, false) });
      
      for (const block1 of slot1Blocks) {
        for (const block2 of slot2Blocks) {
          for (const interval1 of block1.intervals) {
            for (const interval2 of block2.intervals) {
              if (intervalsOverlap(interval1, interval2)) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Sovrapposizione tra fascia ${i + 1} e fascia ${j + 1}`, path: ['timeSlots', i, 'startTime'] });
                return;
              }
            }
          }
        }
      }
    }
  }
});

export type ShiftTemplateFormData = z.infer<typeof shiftTemplateSchema>;

export const TEMPLATE_COLORS = [
  { name: 'WindTre Orange', value: '#FF6900', class: 'bg-orange-500' },
  { name: 'Purple', value: '#8B5CF6', class: 'bg-purple-500' },
  { name: 'Blue', value: '#3B82F6', class: 'bg-blue-500' },
  { name: 'Green', value: '#10B981', class: 'bg-emerald-500' },
  { name: 'Red', value: '#EF4444', class: 'bg-red-500' },
  { name: 'Yellow', value: '#F59E0B', class: 'bg-amber-500' }
];

export interface ShiftTemplate {
  id: string;
  name: string;
  description?: string;
  storeId?: string;
  status?: 'active' | 'archived';
  shiftType?: 'slot_based' | 'split_shift';
  globalClockInTolerance?: number;
  globalClockOutTolerance?: number;
  globalBreakMinutes?: number;
  timeSlots: Array<{
    segmentType: 'continuous' | 'split' | 'triple' | 'quad';
    startTime: string;
    endTime: string;
    block2StartTime?: string;
    block2EndTime?: string;
    block3StartTime?: string;
    block3EndTime?: string;
    block4StartTime?: string;
    block4EndTime?: string;
    breakMinutes?: number;
    clockInToleranceMinutes?: number;
    clockOutToleranceMinutes?: number;
  }>;
  color?: string;
  isActive: boolean;
  notes?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultBreakMinutes?: number;
  clockInToleranceMinutes?: number;
  clockOutToleranceMinutes?: number;
}

export function getDefaultFormValues(template?: ShiftTemplate, mode: 'create' | 'edit' | 'duplicate' = 'create'): ShiftTemplateFormData {
  if (!template || mode === 'create') {
    return {
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
  }
  
  const templateName = mode === 'duplicate' ? `${template.name || ''} (Copia)` : template.name || '';
  
  return {
    name: templateName,
    description: template.description || '',
    storeId: template.storeId || 'global',
    status: template.status || 'active',
    shiftType: template.shiftType || 'slot_based',
    globalClockInTolerance: template.globalClockInTolerance || 15,
    globalClockOutTolerance: template.globalClockOutTolerance || 15,
    globalBreakMinutes: template.globalBreakMinutes || 30,
    timeSlots: template.timeSlots || (template.defaultStartTime ? [{
      segmentType: 'continuous' as const,
      startTime: template.defaultStartTime,
      endTime: template.defaultEndTime || '17:00',
      breakMinutes: template.defaultBreakMinutes || 30,
      clockInToleranceMinutes: template.clockInToleranceMinutes || 15,
      clockOutToleranceMinutes: template.clockOutToleranceMinutes || 15
    }] : [{ segmentType: 'continuous' as const, startTime: '09:00', endTime: '17:00', breakMinutes: 30, clockInToleranceMinutes: 15, clockOutToleranceMinutes: 15 }]),
    color: template.color || '#FF6900',
    isActive: template.isActive ?? true,
    notes: template.notes || ''
  };
}
