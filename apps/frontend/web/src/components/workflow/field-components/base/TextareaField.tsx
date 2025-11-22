/**
 * 📄 TEXTAREA FIELD COMPONENT
 * Multi-line text input for long strings
 */

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { BaseFieldProps } from '../types';

export function TextareaField({ name, control, metadata, disabled, className }: BaseFieldProps) {
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
            <Textarea
              {...field}
              placeholder={metadata.description || `Inserisci ${metadata.label.toLowerCase()}`}
              disabled={disabled}
              maxLength={metadata.maxLength}
              rows={4}
              data-testid={`textarea-${name}`}
              className="bg-white/70 backdrop-blur-sm border-white/30 resize-none"
            />
          </FormControl>
          {metadata.description && (
            <FormDescription className="text-xs">
              {metadata.description}
            </FormDescription>
          )}
          <FormMessage />
          {metadata.maxLength && (
            <p className="text-xs text-gray-500 mt-1">
              Massimo {metadata.maxLength} caratteri
            </p>
          )}
        </FormItem>
      )}
    />
  );
}
