/**
 * 📝 STRING FIELD COMPONENT
 * Basic text input for string fields
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

export function StringField({ name, control, metadata, disabled, className }: BaseFieldProps) {
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
              type="text"
              placeholder={metadata.description || `Inserisci ${metadata.label.toLowerCase()}`}
              disabled={disabled}
              maxLength={metadata.maxLength}
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
          {metadata.minLength && (
            <p className="text-xs text-gray-500 mt-1">
              Minimo {metadata.minLength} caratteri
            </p>
          )}
        </FormItem>
      )}
    />
  );
}
