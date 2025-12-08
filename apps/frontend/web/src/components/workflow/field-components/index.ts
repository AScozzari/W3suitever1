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

// === CUSTOM COMPONENTS (Workflow-specific) ===
export { CronExpressionBuilder } from './custom/CronExpressionBuilder';
export { WebhookAuthConfig } from './custom/WebhookAuthConfig';
export { IPWhitelistBuilder } from './custom/IPWhitelistBuilder';

// === RESOURCE COMPONENTS ===
export { ResourceField } from './resource/ResourceField';

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
import { CronExpressionBuilder } from './custom/CronExpressionBuilder';
import { WebhookAuthConfig } from './custom/WebhookAuthConfig';
import { IPWhitelistBuilder } from './custom/IPWhitelistBuilder';
import { ResourceField } from './resource/ResourceField';
import { FieldComponentRegistry, FieldComponent, CustomComponentRegistry } from './types';

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
  
  // Resource types
  resource: ResourceField,
  
  // Unsupported → will use JSON fallback
  unsupported: StringField, // Temporary fallback
};

/**
 * Custom Component Registry for component hints
 * Maps .describe('component:xxx') hints to specialized components
 */
export const CUSTOM_COMPONENT_REGISTRY: Partial<CustomComponentRegistry> = {
  'cron-expression-builder': CronExpressionBuilder,
  'webhook-auth-config': WebhookAuthConfig,
  'ip-whitelist-builder': IPWhitelistBuilder,
  'response-headers-builder': RecordField, // Reuse RecordField for key-value pairs
  'weekday-selector': ArrayField, // Reuse ArrayField with enum for weekdays
  'workflow-multi-selector': ArrayField, // Reuse ArrayField for workflow IDs
  'json-editor': RecordField, // Reuse RecordField for free-form JSON
};

/**
 * Get field component from registry based on field type
 */
export function getFieldComponent(
  fieldType: keyof FieldComponentRegistry
): FieldComponent | null {
  return (DEFAULT_FIELD_REGISTRY as any)[fieldType] || null;
}

/**
 * Get custom component by hint name
 */
export function getCustomComponent(
  componentHint: string
): FieldComponent | null {
  return (CUSTOM_COMPONENT_REGISTRY as any)[componentHint] || null;
}
