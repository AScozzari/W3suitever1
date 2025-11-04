import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Clock, Plus, Trash2 } from 'lucide-react';

export interface TimeRange {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface DaySchedule {
  enabled: boolean;
  ranges: TimeRange[];
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface BusinessHoursEditorProps {
  value: BusinessHours | null;
  onChange: (hours: BusinessHours) => void;
  className?: string;
}

const DAYS = [
  { key: 'monday' as const, label: 'Lunedì' },
  { key: 'tuesday' as const, label: 'Martedì' },
  { key: 'wednesday' as const, label: 'Mercoledì' },
  { key: 'thursday' as const, label: 'Giovedì' },
  { key: 'friday' as const, label: 'Venerdì' },
  { key: 'saturday' as const, label: 'Sabato' },
  { key: 'sunday' as const, label: 'Domenica' }
];

const DEFAULT_SCHEDULE: DaySchedule = {
  enabled: true,
  ranges: [{ start: '09:00', end: '18:00' }]
};

const DEFAULT_HOURS: BusinessHours = {
  monday: DEFAULT_SCHEDULE,
  tuesday: DEFAULT_SCHEDULE,
  wednesday: DEFAULT_SCHEDULE,
  thursday: DEFAULT_SCHEDULE,
  friday: DEFAULT_SCHEDULE,
  saturday: { enabled: false, ranges: [] },
  sunday: { enabled: false, ranges: [] }
};

export function BusinessHoursEditor({ value, onChange, className }: BusinessHoursEditorProps) {
  const [hours, setHours] = useState<BusinessHours>(value || DEFAULT_HOURS);

  useEffect(() => {
    if (value) {
      setHours(value);
    }
  }, [value]);

  const handleDayToggle = (day: keyof BusinessHours, enabled: boolean) => {
    const updated = {
      ...hours,
      [day]: {
        ...hours[day],
        enabled,
        ranges: enabled && hours[day].ranges.length === 0
          ? [{ start: '09:00', end: '18:00' }]
          : hours[day].ranges
      }
    };
    setHours(updated);
    onChange(updated);
  };

  const handleTimeChange = (
    day: keyof BusinessHours,
    rangeIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const updated = { ...hours };
    updated[day].ranges[rangeIndex][field] = value;
    setHours(updated);
    onChange(updated);
  };

  const addTimeRange = (day: keyof BusinessHours) => {
    const updated = { ...hours };
    updated[day].ranges.push({ start: '09:00', end: '18:00' });
    setHours(updated);
    onChange(updated);
  };

  const removeTimeRange = (day: keyof BusinessHours, rangeIndex: number) => {
    const updated = { ...hours };
    updated[day].ranges.splice(rangeIndex, 1);
    setHours(updated);
    onChange(updated);
  };

  const applyToAllWeekdays = () => {
    const mondaySchedule = hours.monday;
    const updated = {
      ...hours,
      tuesday: { ...mondaySchedule },
      wednesday: { ...mondaySchedule },
      thursday: { ...mondaySchedule },
      friday: { ...mondaySchedule }
    };
    setHours(updated);
    onChange(updated);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Orari di Attività AI
        </CardTitle>
        <CardDescription>
          Configura gli orari in cui l'AI Voice Agent risponde automaticamente alle chiamate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="border-b pb-4 last:border-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={hours[key].enabled}
                  onCheckedChange={(enabled) => handleDayToggle(key, enabled)}
                  data-testid={`switch-day-${key}`}
                />
                <Label className="font-medium text-base">{label}</Label>
              </div>
              {key === 'monday' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyToAllWeekdays}
                  data-testid="button-apply-all-weekdays"
                >
                  Applica a Lun-Ven
                </Button>
              )}
            </div>

            {hours[key].enabled && (
              <div className="ml-11 space-y-2">
                {hours[key].ranges.map((range, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={range.start}
                        onChange={(e) => handleTimeChange(key, idx, 'start', e.target.value)}
                        className="border rounded px-3 py-1.5 text-sm"
                        data-testid={`input-start-${key}-${idx}`}
                      />
                      <span className="text-sm text-muted-foreground">-</span>
                      <input
                        type="time"
                        value={range.end}
                        onChange={(e) => handleTimeChange(key, idx, 'end', e.target.value)}
                        className="border rounded px-3 py-1.5 text-sm"
                        data-testid={`input-end-${key}-${idx}`}
                      />
                    </div>
                    {hours[key].ranges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTimeRange(key, idx)}
                        data-testid={`button-remove-range-${key}-${idx}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTimeRange(key)}
                  className="mt-2"
                  data-testid={`button-add-range-${key}`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi Fascia Oraria
                </Button>
              </div>
            )}

            {!hours[key].enabled && (
              <div className="ml-11 text-sm text-muted-foreground">Chiuso</div>
            )}
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Nota:</strong> Al di fuori di questi orari, le chiamate verranno inoltrate all'interno di fallback configurato.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
