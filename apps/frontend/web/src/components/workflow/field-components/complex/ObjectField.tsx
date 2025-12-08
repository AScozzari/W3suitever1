/**
 * 📦 OBJECT FIELD COMPONENT
 * Nested object fields with collapsible card
 * Recursive renderer for nested structures
 */

import {
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { BaseFieldProps } from '../types';
import { getFieldComponent } from '../index';

export function ObjectField({ name, control, metadata, disabled, className }: BaseFieldProps) {
  const [isOpen, setIsOpen] = useState(true);
  const nestedFields = metadata.nestedFields || {};

  return (
    <Card className={`bg-gradient-to-br from-windtre-orange/5 to-windtre-purple/5 border-white/30 ${className || ''}`}>
      <CardHeader className="pb-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full justify-start p-0 h-auto hover:bg-white/20 transition-colors -mx-2 px-2 rounded-lg"
        >
          <div className="flex items-center gap-2 w-full">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
            )}
            <div className="text-left flex-1">
              <CardTitle className="text-base font-semibold">
                {metadata.label}
                {metadata.required && <span className="text-red-500 ml-1">*</span>}
              </CardTitle>
              {metadata.description && (
                <FormDescription className="text-xs mt-1">
                  {metadata.description}
                </FormDescription>
              )}
            </div>
          </div>
        </Button>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-0 space-y-4">
          {Object.entries(nestedFields).map(([fieldKey, fieldMeta]) => {
            // Get component for nested field type
            const FieldComponent = getFieldComponent(fieldMeta.type as any);
            
            if (!FieldComponent) {
              console.warn(`[ObjectField] No component for nested field type: ${fieldMeta.type}`);
              return null;
            }

            // Construct nested field path with dot notation
            const nestedPath = `${name}.${fieldKey}` as any;

            return (
              <FieldComponent
                key={fieldKey}
                name={nestedPath}
                control={control}
                metadata={fieldMeta}
                disabled={disabled}
              />
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
