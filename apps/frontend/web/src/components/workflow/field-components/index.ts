/**
 * 🎨 FIELD COMPONENTS LIBRARY
 * Registry-based dynamic form field components
 */

// === TYPES ===
export type { BaseFieldProps, FieldComponent, FieldComponentRegistry, CustomComponentRegistry } from './types';

// === BASE COMPONENTS ===
export { StringField } from './base/StringField';
export { NumberField } from './base/NumberField';
export { TextareaField } from './base/TextareaField';
export { EmailField } from './base/EmailField';
export { UrlField } from './base/UrlField';
export { DateField } from './base/DateField';

// === SELECTION COMPONENTS ===
export { SelectField } from './selection/SelectField';
export { ToggleField } from './selection/ToggleField';
export { RadioGroupField } from './selection/RadioGroupField';

// === COMPLEX COMPONENTS ===
export { ArrayField } from './complex/ArrayField';
export { ObjectField } from './complex/ObjectField';
export { RecordField } from './complex/RecordField';

// === RESOURCE COMPONENTS (coming soon) ===
// export { ResourceField } from './resource/ResourceField';

// === DEFAULT FIELD COMPONENT REGISTRY ===
import { StringField } from './base/StringField';
import { NumberField } from './base/NumberField';
import { TextareaField } from './base/TextareaField';
import { EmailField } from './base/EmailField';
import { UrlField } from './base/UrlField';
import { DateField } from './base/DateField';
import { SelectField } from './selection/SelectField';
import { ToggleField } from './selection/ToggleField';
import { ArrayField } from './complex/ArrayField';
import { ObjectField } from './complex/ObjectField';
import { RecordField } from './complex/RecordField';
import { FieldComponentRegistry, FieldComponent } from './types';

/**
 * Default Field Component Registry
 * Maps field types from ZodSchemaParser to React components
 */
export const DEFAULT_FIELD_REGISTRY: Partial<FieldComponentRegistry> = {
  // Base types
  string: StringField,
  number: NumberField,
  textarea: TextareaField,
  email: EmailField,
  url: UrlField,
  date: DateField,
  
  // Selection types
  boolean: ToggleField,
  enum: SelectField,
  literal: StringField, // Read-only literal → use string field (disabled)
  
  // Complex types
  array: ArrayField,
  object: ObjectField,
  record: RecordField,
  
  // Unsupported → will use JSON fallback
  unsupported: StringField, // Temporary fallback
};

/**
 * Get field component from registry based on field type
 */
export function getFieldComponent(
  fieldType: keyof FieldComponentRegistry
): FieldComponent | null {
  return (DEFAULT_FIELD_REGISTRY as any)[fieldType] || null;
}
