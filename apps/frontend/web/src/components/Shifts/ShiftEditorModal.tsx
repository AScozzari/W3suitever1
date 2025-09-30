import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Clock, Users, Coffee, Briefcase, Palette, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ShiftData {
  id?: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
  shiftType: 'morning' | 'afternoon' | 'night';
  breakMinutes: number;
  skills?: string[];
  notes?: string;
  color?: string;
  recurring?: {
    enabled: boolean;
    pattern: 'daily' | 'weekly' | 'monthly';
    endDate?: string;
    daysOfWeek?: number[];
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  shift?: any;
  storeId: string;
  onSave: (data: ShiftData) => Promise<void>;
}

const SKILL_OPTIONS = [
  'cassa',
  'customer-service',
  'inventario',
  'logistica',
  'gestione-team',
  'formazione',
  'sicurezza',
  'pulizie'
];

const SHIFT_COLORS = [
  { name: 'Orange', value: '#FF6900', gradient: 'from-orange-400 to-orange-500' },
  { name: 'Blue', value: '#3B82F6', gradient: 'from-blue-400 to-blue-500' },
  { name: 'Purple', value: '#8B5CF6', gradient: 'from-purple-400 to-purple-500' },
  { name: 'Green', value: '#10B981', gradient: 'from-green-400 to-green-500' },
  { name: 'Red', value: '#EF4444', gradient: 'from-red-400 to-red-500' },
  { name: 'Yellow', value: '#F59E0B', gradient: 'from-yellow-400 to-yellow-500' }
];

export default function ShiftEditorModal({
  isOpen,
  onClose,
  shift,
  storeId,
  onSave
}: Props) {
  const [formData, setFormData] = useState<ShiftData>({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    requiredStaff: 2,
    shiftType: 'morning',
    breakMinutes: 30,
    skills: [],
    notes: '',
    color: '#FF6900',
    recurring: {
      enabled: false,
      pattern: 'weekly'
    }
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Load shift data if editing
  useEffect(() => {
    if (shift) {
      setFormData({
        id: shift.id,
        name: shift.name || '',
        date: shift.date || format(new Date(), 'yyyy-MM-dd'),
        startTime: typeof shift.startTime === 'string' 
          ? shift.startTime 
          : format(new Date(shift.startTime), 'HH:mm'),
        endTime: typeof shift.endTime === 'string' 
          ? shift.endTime 
          : format(new Date(shift.endTime), 'HH:mm'),
        requiredStaff: shift.requiredStaff || 2,
        shiftType: shift.shiftType || 'morning',
        breakMinutes: shift.breakMinutes || 30,
        skills: shift.skills || [],
        notes: shift.notes || '',
        color: shift.color || '#FF6900'
      });
    }
  }, [shift]);
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) {
      newErrors.name = 'Nome turno richiesto';
    }
    
    if (!formData.date) {
      newErrors.date = 'Data richiesta';
    }
    
    if (!formData.startTime || !formData.endTime) {
      newErrors.time = 'Orari richiesti';
    } else {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      if (end <= start && !formData.endTime.startsWith('0')) {
        newErrors.time = 'L\'ora di fine deve essere dopo l\'inizio';
      }
    }
    
    if (formData.requiredStaff < 1) {
      newErrors.requiredStaff = 'Almeno 1 persona richiesta';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Auto-detect shift type based on time
  const detectShiftType = (startTime: string): 'morning' | 'afternoon' | 'night' => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
  };
  
  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'startTime') {
        updated.shiftType = detectShiftType(value);
      }
      return updated;
    });
  };
  
  const handleSkillToggle = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...(prev.skills || []), skill]
    }));
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Convert time strings to Date objects
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
      
      // Handle overnight shifts
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }
      
      await onSave({
        ...formData,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString()
      });
      
      onClose();
    } catch (error) {
      // Error is already shown via toast from parent component
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {shift ? 'Modifica Turno' : 'Nuovo Turno'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">Dettagli</TabsTrigger>
            <TabsTrigger value="requirements">Requisiti</TabsTrigger>
            <TabsTrigger value="recurring">Ricorrenza</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Turno *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="es. Turno Standard Store"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && (
                  <p className="text-xs text-red-500 mt-1">{errors.date}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="startTime">Ora Inizio *</Label>
                <div className="relative">
                  <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleTimeChange('startTime', e.target.value)}
                    className={cn("pl-8", errors.time ? 'border-red-500' : '')}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="endTime">Ora Fine *</Label>
                <div className="relative">
                  <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleTimeChange('endTime', e.target.value)}
                    className={cn("pl-8", errors.time ? 'border-red-500' : '')}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="breakMinutes">Pausa (min)</Label>
                <div className="relative">
                  <Coffee className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="breakMinutes"
                    type="number"
                    min="0"
                    value={formData.breakMinutes}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      breakMinutes: parseInt(e.target.value) || 0 
                    })}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            
            {errors.time && (
              <p className="text-xs text-red-500">{errors.time}</p>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shiftType">Tipo Turno</Label>
                <Select
                  value={formData.shiftType}
                  onValueChange={(v) => setFormData({ ...formData, shiftType: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Standard Full-Time</SelectItem>
                    <SelectItem value="part_time">Part-Time</SelectItem>
                    <SelectItem value="flexible">Flessibile</SelectItem>
                    <SelectItem value="overtime">Straordinario</SelectItem>
                    <SelectItem value="custom">Personalizzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="requiredStaff">Staff Richiesto *</Label>
                <div className="relative">
                  <Users className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="requiredStaff"
                    type="number"
                    min="1"
                    value={formData.requiredStaff}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      requiredStaff: parseInt(e.target.value) || 1 
                    })}
                    className={cn("pl-8", errors.requiredStaff ? 'border-red-500' : '')}
                  />
                </div>
                {errors.requiredStaff && (
                  <p className="text-xs text-red-500 mt-1">{errors.requiredStaff}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Note / Istruzioni</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Aggiungi note o istruzioni specifiche per questo turno..."
                rows={3}
              />
            </div>
            
            <div>
              <Label>Colore Visuale</Label>
              <div className="flex gap-2 mt-2">
                {SHIFT_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    className={cn(
                      "w-10 h-10 rounded-lg bg-gradient-to-r transition-all",
                      color.gradient,
                      formData.color === color.value && "ring-2 ring-offset-2 ring-orange-400"
                    )}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="requirements" className="space-y-4 mt-4">
            <div>
              <Label>Skills Richieste</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Seleziona le competenze necessarie per questo turno
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SKILL_OPTIONS.map(skill => (
                  <label
                    key={skill}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Checkbox
                      checked={formData.skills?.includes(skill)}
                      onCheckedChange={() => handleSkillToggle(skill)}
                    />
                    <span className="text-sm capitalize">{skill.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {formData.skills && formData.skills.length > 0 && (
              <div>
                <Label>Riepilogo Skills</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {formData.skills.map(skill => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recurring" className="space-y-4 mt-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Funzionalità in arrivo</p>
                  <p className="text-muted-foreground">
                    La creazione di turni ricorrenti sarà disponibile nella prossima versione.
                    Per ora, usa i template per creare turni ripetuti.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="opacity-50 pointer-events-none">
              <label className="flex items-center gap-2">
                <Checkbox />
                <span>Abilita ricorrenza</span>
              </label>
              
              <div className="mt-4 space-y-4">
                <div>
                  <Label>Pattern</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona pattern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Giornaliero</SelectItem>
                      <SelectItem value="weekly">Settimanale</SelectItem>
                      <SelectItem value="monthly">Mensile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Termina il</Label>
                  <Input type="date" disabled />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-orange-600"
          >
            {loading ? 'Salvataggio...' : shift ? 'Salva Modifiche' : 'Crea Turno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}