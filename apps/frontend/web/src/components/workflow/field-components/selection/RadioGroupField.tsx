/**
 * 📻 RADIO GROUP FIELD COMPONENT
 * Radio buttons for enum fields with few options (< 5)
 */

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BaseFieldProps } from '../types';

export function RadioGroupField({ name, control, metadata, disabled, className }: BaseFieldProps) {
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
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              defaultValue={field.value || metadata.defaultValue}
              disabled={disabled}
              className="flex flex-col space-y-2"
              data-testid={`radio-group-${name}`}
            >
              {enumValues.map((value) => (
                <div key={String(value)} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={String(value)}
                    id={`${name}-${value}`}
                    data-testid={`radio-option-${value}`}
                  />
                  <Label
                    htmlFor={`${name}-${value}`}
                    className="font-normal cursor-pointer"
                  >
                    {String(value)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </FormControl>
          {metadata.description && (
            <FormDescription className="text-xs mt-2">
              {metadata.description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
