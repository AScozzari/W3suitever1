/**
 * 🔗 URL FIELD COMPONENT
 * URL input with validation and link icon
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
import { Link } from 'lucide-react';
import { BaseFieldProps } from '../types';

export function UrlField({ name, control, metadata, disabled, className }: BaseFieldProps) {
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
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                {...field}
                type="url"
                placeholder={metadata.description || "https://example.com"}
                disabled={disabled}
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
