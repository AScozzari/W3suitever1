/**
 * 📅 DATE FIELD COMPONENT
 * Date picker using HTML5 date input
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
import { Calendar } from 'lucide-react';
import { BaseFieldProps } from '../types';

export function DateField({ name, control, metadata, disabled, className }: BaseFieldProps) {
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
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                {...field}
                type="date"
                disabled={disabled}
                value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value || ''}
                onChange={(e) => {
                  const dateValue = e.target.value ? new Date(e.target.value) : null;
                  field.onChange(dateValue);
                }}
                data-testid={`input-${name}`}
                className="bg-white/70 backdrop-blur-sm border-white/30 pl-10"
              />
            </div>
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
