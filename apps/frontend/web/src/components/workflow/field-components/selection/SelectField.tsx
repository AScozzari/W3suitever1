/**
 * 🎯 SELECT FIELD COMPONENT
 * Dropdown select for enum fields
 */

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BaseFieldProps } from '../types';

export function SelectField({ name, control, metadata, disabled, className }: BaseFieldProps) {
  const enumValues = metadata.enumValues || [];
  
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
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value || metadata.defaultValue}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger
                data-testid={`select-${name}`}
                className="bg-white/70 backdrop-blur-sm border-white/30"
              >
                <SelectValue placeholder={`Seleziona ${metadata.label.toLowerCase()}`} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {enumValues.map((value) => (
                <SelectItem
                  key={String(value)}
                  value={String(value)}
                  data-testid={`select-option-${value}`}
                >
                  {String(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
