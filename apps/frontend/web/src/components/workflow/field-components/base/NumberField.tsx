/**
 * 🔢 NUMBER FIELD COMPONENT
 * Numeric input with min/max validation
 */

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { BaseFieldProps } from '../types';

export function NumberField({ name, control, metadata, disabled, className }: BaseFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {metadata.label}
            {metadata.required && <span className="text-red-500 ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              type="number"
              placeholder={metadata.description || `Inserisci ${metadata.label.toLowerCase()}`}
              disabled={disabled}
              min={metadata.min}
              max={metadata.max}
              onChange={(e) => field.onChange(e.target.valueAsNumber)}
              data-testid={`input-${name}`}
              className="bg-white/70 backdrop-blur-sm border-white/30"
            />
          </FormControl>
          {metadata.description && (
            <FormDescription className="text-xs">
              {metadata.description}
            </FormDescription>
          )}
          <FormMessage />
          {(metadata.min !== undefined || metadata.max !== undefined) && (
            <p className="text-xs text-gray-500 mt-1">
              {metadata.min !== undefined && metadata.max !== undefined
                ? `Range: ${metadata.min} - ${metadata.max}`
                : metadata.min !== undefined
                ? `Minimo: ${metadata.min}`
                : `Massimo: ${metadata.max}`}
            </p>
          )}
        </FormItem>
      )}
    />
  );
}
