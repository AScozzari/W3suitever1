/**
 * 🗂️ RESOURCE FIELD COMPONENT
 * Input field for selecting/referencing resources (templates, workflows, etc.)
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
import { FileText } from 'lucide-react';

export function ResourceField({ name, control, metadata, disabled, className }: BaseFieldProps) {
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
              <Input
                {...field}
                type="text"
                placeholder={metadata.description || `Seleziona o inserisci ${metadata.label.toLowerCase()}`}
                disabled={disabled}
                data-testid={`input-resource-${name}`}
                className="bg-white/70 backdrop-blur-sm border-white/30 pl-10"
              />
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </FormControl>
          {metadata.description && (
            <FormDescription className="text-xs">
              {metadata.description}
            </FormDescription>
          )}
          <FormMessage />
          <p className="text-xs text-blue-600 mt-1">
            💡 Riferimento a risorsa (template, workflow, etc.)
          </p>
        </FormItem>
      )}
    />
  );
}
