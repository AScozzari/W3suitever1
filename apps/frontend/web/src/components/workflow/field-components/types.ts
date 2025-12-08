/**
 * 🎯 FIELD COMPONENT TYPES & REGISTRY CONTRACT
 * 
 * Definisce l'interfaccia per field components dinamici
 * usati nel DynamicFormRenderer del NodeConfigFormHost
 */

import { Control, FieldValues, Path } from 'react-hook-form';
import { FieldMetadata } from '@/lib/zod-schema-parser';

/**
 * Shared props for all field components
 * - Uses react-hook-form Control for integration
 * - Supports nested paths with dot notation (e.g., "escalation.delayHours")
 */
export interface BaseFieldProps<T extends FieldValues = any> {
  name: Path<T>; // Field path (dot notation for nested fields)
  control: Control<T>; // react-hook-form control
  metadata: FieldMetadata; // Parsed Zod metadata
  disabled?: boolean;
  className?: string;
}

/**
 * Field Component Renderer type
 * Each component must accept BaseFieldProps
 */
export type FieldComponent<T extends FieldValues = any> = 
  React.ComponentType<BaseFieldProps<T>>;

/**
 * Field Component Registry
 * Maps field types to their React components
 * 
 * Example usage:
 * registry['string'] → StringField component
 * registry['email'] → EmailField component
 * registry['enum'] → SelectField component
 */
export interface FieldComponentRegistry {
  // Base types
  string: FieldComponent;
  number: FieldComponent;
  textarea: FieldComponent;
  email: FieldComponent;
  url: FieldComponent;
  date: FieldComponent;
  
  // Selection types
  boolean: FieldComponent; // Toggle switch
  enum: FieldComponent; // Select dropdown
  literal: FieldComponent; // Read-only literal value
  
  // Complex types
  array: FieldComponent; // Dynamic list (useFieldArray)
  object: FieldComponent; // Nested fields (recursive)
  record: FieldComponent; // Key-value pairs
  union: FieldComponent; // Union selector
  
  // Resource types (autocomplete API-based)
  resource: FieldComponent; // Pipeline/Team/User/Store/Template selectors
  
  // Unsupported fallback
  unsupported: FieldComponent; // JSON editor fallback
}

/**
 * Component hint → Custom component mapping
 * For special fields with .describe('component:xxx')
 * 
 * Example:
 * .describe('component:condition-builder') → ConditionBuilderField
 * .describe('component:template-selector') → TemplateSelectorField
 */
export interface CustomComponentRegistry {
  'condition-builder': FieldComponent;
  'template-selector': FieldComponent;
  [key: string]: FieldComponent;
}
