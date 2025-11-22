import { useState, useEffect } from 'react';
import { useWatch } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BaseFieldProps } from '../types';
import { Clock, Info, AlertCircle } from 'lucide-react';
import { ControllerRenderProps } from 'react-hook-form';
import parser from 'cron-parser';

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every day at 9 AM', value: '0 9 * * *' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'First day of month at midnight', value: '0 0 1 * *' },
];

function generateNextRuns(expression: string, timezone = 'Europe/Rome'): { success: true; runs: string[] } | { success: false; error: string } {
  try {
    const interval = parser.parseExpression(expression, {
      tz: timezone,
      currentDate: new Date()
    });
    
    const runs: string[] = [];
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: false
    });
    
    for (let i = 0; i < 3; i++) {
      const next = interval.next().toDate();
      runs.push(formatter.format(next));
    }
    
    return { success: true, runs };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Invalid cron expression' 
    };
  }
}

interface CronInputProps {
  field: ControllerRenderProps<any, any>;
  disabled?: boolean;
  name: string;
  timezone?: string;
}

function CronInput({ field, disabled, name, timezone = 'Europe/Rome' }: CronInputProps) {
  const [nextRuns, setNextRuns] = useState<string[]>([]);
  const [parsingError, setParsingError] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  useEffect(() => {
    if (field.value) {
      const result = generateNextRuns(field.value, timezone);
      if (result.success) {
        setNextRuns(result.runs);
        setParsingError('');
      } else {
        setNextRuns([]);
        setParsingError(result.error);
      }
    } else {
      setNextRuns([]);
      setParsingError('');
    }
  }, [field.value, timezone]);

  const handlePresetSelect = (preset: string) => {
    field.onChange(preset);
    setSelectedPreset('');
  };

  const hasError = parsingError !== '';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          {...field}
          placeholder="0 9 * * *"
          disabled={disabled}
          className={hasError ? 'border-red-500' : 'bg-white/70 backdrop-blur-sm border-white/30'}
          data-testid={`input-${name}`}
        />
        
        <Select value={selectedPreset} onValueChange={handlePresetSelect}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Quick presets..." />
          </SelectTrigger>
          <SelectContent>
            {CRON_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {parsingError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            {parsingError}
          </AlertDescription>
        </Alert>
      )}

      {!parsingError && nextRuns.length > 0 && (
        <Alert className="py-2 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-3 w-3" />
          <AlertDescription className="text-xs">
            <div className="font-medium mb-1">Next 3 executions (Timezone: {timezone}):</div>
            {nextRuns.map((run, idx) => (
              <div key={idx} className="text-muted-foreground font-mono text-xs">{run}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-muted-foreground">
        Format: <code className="bg-muted px-1 rounded">minute hour day month weekday</code>
        <br />
        Supports: <code className="bg-muted px-1 rounded">*</code> (any), 
        <code className="bg-muted px-1 rounded">*/5</code> (every 5), 
        <code className="bg-muted px-1 rounded">1-5</code> (range), 
        <code className="bg-muted px-1 rounded">1,3,5</code> (list)
      </div>
    </div>
  );
}

export function CronExpressionBuilder({ name, control, metadata, disabled }: BaseFieldProps) {
  const timezone = useWatch({
    control,
    name: 'cron.timezone',
    defaultValue: 'Europe/Rome'
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem data-testid={`field-${name}`}>
          <FormLabel className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {metadata.label}
            {metadata.required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>

          <FormControl>
            <CronInput field={field} disabled={disabled} name={name as string} timezone={timezone} />
          </FormControl>

          {metadata.description && (
            <FormDescription className="text-xs">
              {metadata.description}
            </FormDescription>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
