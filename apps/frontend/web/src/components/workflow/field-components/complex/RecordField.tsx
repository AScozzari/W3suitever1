/**
 * 🗂️ RECORD FIELD COMPONENT
 * Key-value pairs builder (for z.record)
 * Allows adding/removing dynamic key-value entries
 */

import { useFieldArray } from 'react-hook-form';
import {
  FormDescription,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { BaseFieldProps } from '../types';

export function RecordField({ name, control, metadata, disabled, className }: BaseFieldProps) {
  // Convert record object to array of {key, value} pairs for useFieldArray
  const { fields, append, remove } = useFieldArray({
    control,
    name: `${name}_entries` as any, // Internal array representation
  });

  const handleAdd = () => {
    append({ key: '', value: '' } as any);
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
              {/* Key input */}
              <div className="flex-1">
                <Input
                  placeholder="Chiave"
                  disabled={disabled}
                  data-testid={`record-key-${index}`}
                  className="bg-white/50"
                />
              </div>

              {/* Value input */}
              <div className="flex-1">
                <Input
                  placeholder="Valore"
                  disabled={disabled}
                  data-testid={`record-value-${index}`}
                  className="bg-white/50"
                />
              </div>

              {/* Remove button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                disabled={disabled}
                data-testid={`record-remove-${index}`}
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
          disabled={disabled}
          data-testid={`record-add-${name}`}
          className="w-full bg-white/70 hover:bg-white/90 border-white/30"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi coppia chiave-valore
        </Button>
      </div>
    </div>
  );
}
