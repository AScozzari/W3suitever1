/**
 * 🎨 DYNAMIC FORM RENDERER
 * 
 * Genera automaticamente form UI da schema Zod usando Field Components Registry
 * - Parse Zod schema → field metadata
 * - Render field components dinamicamente
 * - Supporta component hints per campi speciali
 * - Fallback a JSON per campi unsupported
 * 
 * Integration with react-hook-form + zodResolver for real-time validation
 */

import { Control, FieldValues } from 'react-hook-form';
import { z } from 'zod';
import { parseConfigSchema, ParsedSchema } from '@/lib/zod-schema-parser';
import { getFieldComponent } from './field-components';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export interface DynamicFormRendererProps<T extends FieldValues = any> {
  /**
   * Zod schema for config validation
   */
  configSchema: z.ZodSchema<any>;
  
  /**
   * react-hook-form Control from parent
   * Used for integration with NodeConfigFormHost
   */
  control: Control<T>;
  
  /**
   * Optional: Custom component registry for special fields
   * Example: { 'condition-builder': ConditionBuilderField }
   */
  customComponents?: Record<string, React.ComponentType<any>>;
  
  /**
   * Disabled state
   */
  disabled?: boolean;
  
  /**
   * CSS class name
   */
  className?: string;
}

/**
 * DynamicFormRenderer Component
 * Automatically generates form fields from Zod schema
 */
export function DynamicFormRenderer<T extends FieldValues = any>({
  configSchema,
  control,
  customComponents = {},
  disabled = false,
  className = '',
}: DynamicFormRendererProps<T>) {
  // Parse Zod schema to extract field metadata
  const parsedSchema: ParsedSchema = parseConfigSchema(configSchema);

  // Debug output in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[DynamicFormRenderer] Parsed schema:', parsedSchema);
  }

  // Render fields in order
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Warning for unsupported fields */}
      {parsedSchema.unsupportedFields.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            ⚠️ I seguenti campi non sono supportati e richiedono modifica JSON manuale:{' '}
            <strong>{parsedSchema.unsupportedFields.join(', ')}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Info card for nested objects */}
      {parsedSchema.hasNestedObjects && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-800">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            💡 Alcuni campi sono raggruppati in sezioni collassabili per migliore organizzazione
          </AlertDescription>
        </Alert>
      )}

      {/* Render fields dynamically */}
      {parsedSchema.fieldOrder.map((fieldName) => {
        const fieldMeta = parsedSchema.fields[fieldName];
        
        // Skip unsupported fields (will use JSON editor)
        if (fieldMeta.type === 'unsupported') {
          return (
            <Card key={fieldName} className="p-4 bg-yellow-50 border-yellow-200">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-yellow-800">
                  {fieldMeta.label} (JSON required)
                </p>
                <Textarea
                  placeholder={`Campo non supportato - modifica tramite JSON editor`}
                  disabled
                  className="bg-white/50 font-mono text-xs"
                  rows={3}
                />
              </div>
            </Card>
          );
        }

        // Check for custom component hint
        let FieldComponent;
        if (fieldMeta.componentHint && customComponents[fieldMeta.componentHint]) {
          FieldComponent = customComponents[fieldMeta.componentHint];
        } else {
          // Get component from registry based on field type
          FieldComponent = getFieldComponent(fieldMeta.type as any);
        }

        if (!FieldComponent) {
          console.warn(
            `[DynamicFormRenderer] No component found for field "${fieldName}" with type "${fieldMeta.type}"`
          );
          return (
            <Card key={fieldName} className="p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-800">
                ❌ Errore: Nessun componente disponibile per il tipo <code className="font-mono">{fieldMeta.type}</code>
              </p>
            </Card>
          );
        }

        // Render field component
        return (
          <FieldComponent
            key={fieldName}
            name={fieldName as any}
            control={control}
            metadata={fieldMeta}
            disabled={disabled}
          />
        );
      })}

      {/* Empty state */}
      {parsedSchema.fieldOrder.length === 0 && (
        <Alert className="border-gray-200 bg-gray-50">
          <AlertDescription className="text-sm text-gray-600">
            📝 Nessun campo di configurazione disponibile per questo nodo.
            Usa l'editor JSON per configurazioni avanzate.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
