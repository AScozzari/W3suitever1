/**
 * 🔘 TOGGLE FIELD COMPONENT
 * Switch toggle for boolean fields
 */

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { BaseFieldProps } from '../types';

export function ToggleField({ name, control, metadata, disabled, className }: BaseFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={`flex flex-row items-center justify-between rounded-lg border border-white/30 p-4 bg-white/70 backdrop-blur-sm ${className || ''}`}>
          <div className="space-y-0.5">
            <FormLabel className="text-base">
              {metadata.label}
              {metadata.required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            {metadata.description && (
              <FormDescription className="text-xs">
                {metadata.description}
              </FormDescription>
            )}
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
              data-testid={`toggle-${name}`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
