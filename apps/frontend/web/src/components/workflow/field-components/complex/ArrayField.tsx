/**
 * 📋 ARRAY FIELD COMPONENT
 * Dynamic list with add/remove functionality
 * Uses react-hook-form's useFieldArray
 */

import { useFieldArray } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { BaseFieldProps } from '../types';

export function ArrayField({ name, control, metadata, disabled, className }: BaseFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as any,
  });

  // Determine input type based on item type
  const getInputType = () => {
    switch (metadata.itemType) {
      case 'email':
        return 'email';
      case 'url':
        return 'url';
      case 'number':
        return 'number';
      default:
        return 'text';
    }
  };

  const getPlaceholder = () => {
    switch (metadata.itemType) {
      case 'email':
        return 'email@example.com';
      case 'url':
        return 'https://example.com';
      case 'number':
        return '0';
      default:
        return `Nuovo ${metadata.label.toLowerCase()}`;
    }
  };

  const handleAdd = () => {
    const defaultValue = metadata.itemType === 'number' ? 0 : '';
    append(defaultValue as any);
  };

  return (
    <div className={className}>
      <FormLabel>
        {metadata.label}
        {metadata.required && <span className="text-red-500 ml-1">*</span>}
      </FormLabel>
      {metadata.description && (
        <FormDescription className="text-xs mb-2">
          {metadata.description}
        </FormDescription>
      )}

      <div className="space-y-2 mt-2">
        {fields.map((field, index) => (
          <Card
            key={field.id}
            className="p-3 bg-white/70 backdrop-blur-sm border-white/30"
          >
            <div className="flex items-start gap-2">
              {/* Drag handle (visual only for now) */}
              <div className="pt-2 cursor-move opacity-50 hover:opacity-100">
                <GripVertical className="h-4 w-4" />
              </div>

              {/* Input field */}
              <FormField
                control={control}
                name={`${name}.${index}` as any}
                render={({ field: itemField }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        {...itemField}
                        type={getInputType()}
                        placeholder={getPlaceholder()}
                        disabled={disabled}
                        data-testid={`array-item-${index}`}
                        className="bg-white/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remove button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                disabled={disabled || !!(metadata.minItems && fields.length <= metadata.minItems)}
                data-testid={`array-remove-${index}`}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}

        {/* Add button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={disabled || !!(metadata.maxItems && fields.length >= metadata.maxItems)}
          data-testid={`array-add-${name}`}
          className="w-full bg-white/70 hover:bg-white/90 border-white/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi {metadata.label.toLowerCase()}
        </Button>

        {/* Min/Max items hint */}
        {(metadata.minItems || metadata.maxItems) && (
          <p className="text-xs text-gray-500">
            {metadata.minItems && metadata.maxItems
              ? `Range: ${metadata.minItems} - ${metadata.maxItems} elementi`
              : metadata.minItems
              ? `Minimo: ${metadata.minItems} elementi`
              : `Massimo: ${metadata.maxItems} elementi`}
          </p>
        )}
      </div>
    </div>
  );
}
