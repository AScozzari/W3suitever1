import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';

// 🇮🇹 Complete Italian HR Request Categories (NO NOTE SPESE - quelle vanno in Finance)
const ITALIAN_HR_CATEGORIES = {
  leave: {
    name: 'Ferie e Permessi',
    description: 'Vacanze retribuite, ROL, ex festività, permessi brevi',
    icon: '🏖️'
  },
  italian_legal: {
    name: 'Congedi Legali',
    description: 'Matrimonio, maternità, paternità, lutto, Legge 104',
    icon: '⚖️'
  },
  family: {
    name: 'Famiglia e Assistenza',
    description: 'Congedo parentale, allattamento, assistenza familiare',
    icon: '👨‍👩‍👧‍👦'
  },
  professional_development: {
    name: 'Formazione e Carriera', 
    description: 'Corsi, conferenze, sviluppo professionale, certificazioni',
    icon: '📚'
  },
  wellness_health: {
    name: 'Salute e Benessere',
    description: 'Malattia, visite mediche, wellness program, salute mentale',
    icon: '🏥'
  },
  remote_work: {
    name: 'Lavoro Agile',
    description: 'Smart working, lavoro remoto, VPN, equipaggiamento',
    icon: '💻'
  },
  schedule: {
    name: 'Orari e Turni',
    description: 'Straordinari, cambio turni, orario flessibile',
    icon: '⏰'
  },
  other: {
    name: 'Altre Richieste',
    description: 'Richieste particolari e personalizzate',
    icon: '📋'
  }
} as const;

// Type for HR Type entry
type HRTypeEntry = { name: string; desc: string };

// 🇮🇹 Complete Italian HR Request Types
const ITALIAN_HR_TYPES: Record<string, Record<string, HRTypeEntry>> = {
  leave: {
    vacation: { name: 'Ferie Annuali', desc: 'Vacanze retribuite (min. 26gg/anno)' },
    rol_leave: { name: 'Permessi ROL', desc: 'Riduzione Orario Lavoro' },
    personal: { name: 'Permessi Personali', desc: 'Ex festività e permessi brevi' },
    study_leave: { name: 'Permessi Studio', desc: 'Diritto allo studio (150h/3anni)' }
  },
  italian_legal: {
    marriage_leave: { name: 'Congedo Matrimoniale', desc: '15 giorni calendari' },
    bereavement_extended: { name: 'Permesso Lutto', desc: '3 giorni/anno (parenti 2° grado)' },
    law_104_leave: { name: 'Permessi Legge 104', desc: '3 giorni/mese o 2h/giorno' }
  },
  family: {
    maternity_leave: { name: 'Congedo Maternità', desc: '5 mesi retribuiti (2+3)' },
    paternity_leave: { name: 'Congedo Paternità', desc: '10 giorni obbligatori' },
    parental_leave: { name: 'Congedo Parentale', desc: '10-11 mesi totali genitori' },
    breastfeeding_leave: { name: 'Permessi Allattamento', desc: '2h/giorno o riposi giornalieri' }
  },
  professional_development: {
    training_request: { name: 'Richiesta Corso', desc: 'Formazione professionale aziendale' },
    certification_request: { name: 'Certificazioni', desc: 'Qualifiche e abilitazioni' },
    conference_attendance: { name: 'Convegni', desc: 'Partecipazione eventi formativi' }
  },
  wellness_health: {
    sick: { name: 'Malattia', desc: 'Congedo per malattia (certificato)' },
    medical_appt: { name: 'Visita Medica', desc: 'Visite specialistiche, controlli' },
    wellness_program: { name: 'Wellness Program', desc: 'Programmi benessere aziendale' }
  },
  remote_work: {
    wfh: { name: 'Smart Working', desc: 'Lavoro agile da remoto' },
    remote_work_request: { name: 'Lavoro Remoto', desc: 'Telelavoro strutturato' },
    equipment_request: { name: 'Attrezzature', desc: 'PC, monitor, periferiche' }
  },
  schedule: {
    overtime: { name: 'Lavoro Straordinario', desc: 'Ore supplementari' },
    shift_swap: { name: 'Cambio Turno', desc: 'Scambio con colleghi' },
    flex_hours: { name: 'Orario Flessibile', desc: 'Flessibilità entrata/uscita' }
  },
  other: {
    sabbatical_request: { name: 'Anno Sabbatico', desc: 'Aspettativa lunga retribuita' },
    volunteer_leave: { name: 'Volontariato', desc: 'Attività di volontariato' },
    donation_leave: { name: 'Donazione', desc: 'Sangue, midollo, organi' }
  }
};

interface HRRequestFormProps {
  onSubmit: (data: any) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function HRRequestForm({ onSubmit, onBack, isSubmitting }: HRRequestFormProps) {
  const [formData, setFormData] = useState<any>({
    category: '',
    type: '',
    startDate: '',
    endDate: '',
    halfDayStart: false,
    halfDayEnd: false,
    reason: '',
    priority: 'normal'
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Get type details for title
    const category = formData.category as string;
    const typeKey = formData.type as string;
    const typeDetails = ITALIAN_HR_TYPES[category]?.[typeKey];
    
    const baseData = {
      department: 'hr',
      category: formData.category,
      type: formData.type,
      title: typeDetails?.name || 'Richiesta HR',
      description: formData.reason || '',
      requestData: {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        halfDay: {
          start: formData.halfDayStart,
          end: formData.halfDayEnd
        }
      },
      attachmentUrls: [],
      priority: formData.priority
    };

    onSubmit(baseData);
  };

  const getAvailableTypes = (): Record<string, HRTypeEntry> => {
    const category = formData.category as string;
    if (!category || !ITALIAN_HR_TYPES[category]) return {};
    return ITALIAN_HR_TYPES[category];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Richiesta HR</h3>

      {/* Category Selection */}
      <div>
        <Label htmlFor="category">
          Categoria <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.category}
          onValueChange={(value) => {
            updateField('category', value);
            updateField('type', ''); // Reset type when category changes
          }}
          required
        >
          <SelectTrigger data-testid="select-hr-category">
            <SelectValue placeholder="Seleziona categoria" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ITALIAN_HR_CATEGORIES).map(([key, cat]) => (
              <SelectItem key={key} value={key}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type Selection */}
      {formData.category && (
        <div>
          <Label htmlFor="type">
            Tipo Richiesta <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.type}
            onValueChange={(value) => updateField('type', value)}
            required
          >
            <SelectTrigger data-testid="select-hr-type">
              <SelectValue placeholder="Seleziona tipo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(getAvailableTypes()).map(([key, type]) => (
                <SelectItem key={key} value={key}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formData.type && getAvailableTypes()[formData.type] && (
            <p className="text-xs text-gray-500 mt-1">
              {getAvailableTypes()[formData.type].desc}
            </p>
          )}
        </div>
      )}

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">
            Data Inizio <span className="text-red-500">*</span>
          </Label>
          <Input
            id="startDate"
            type="date"
            required
            value={formData.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            data-testid="input-hr-start-date"
          />
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="halfDayStart"
              checked={formData.halfDayStart}
              onChange={(e) => updateField('halfDayStart', e.target.checked)}
              className="mr-2"
              data-testid="checkbox-hr-half-day-start"
            />
            <Label htmlFor="halfDayStart" className="text-sm font-normal cursor-pointer">
              Mezza giornata
            </Label>
          </div>
        </div>

        <div>
          <Label htmlFor="endDate">
            Data Fine <span className="text-red-500">*</span>
          </Label>
          <Input
            id="endDate"
            type="date"
            required
            value={formData.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            min={formData.startDate}
            data-testid="input-hr-end-date"
          />
          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="halfDayEnd"
              checked={formData.halfDayEnd}
              onChange={(e) => updateField('halfDayEnd', e.target.checked)}
              className="mr-2"
              data-testid="checkbox-hr-half-day-end"
            />
            <Label htmlFor="halfDayEnd" className="text-sm font-normal cursor-pointer">
              Mezza giornata
            </Label>
          </div>
        </div>
      </div>

      {/* Reason */}
      <div>
        <Label htmlFor="reason">Motivazione</Label>
        <Textarea
          id="reason"
          value={formData.reason}
          onChange={(e) => updateField('reason', e.target.value)}
          placeholder="Dettagli aggiuntivi..."
          rows={3}
          data-testid="textarea-hr-reason"
        />
      </div>

      {/* Priority */}
      <div>
        <Label htmlFor="priority">Priorità</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) => updateField('priority', value)}
        >
          <SelectTrigger data-testid="select-hr-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Bassa</SelectItem>
            <SelectItem value="normal">Normale</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-between gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          data-testid="button-back"
        >
          Indietro
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
          data-testid="button-submit-hr"
        >
          {isSubmitting ? 'Invio...' : 'Invia Richiesta'}
        </Button>
      </div>
    </form>
  );
}
