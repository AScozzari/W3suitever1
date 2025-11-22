/**
 * 🔍 ZOD SCHEMA PARSER
 * 
 * Estrae metadata da schema Zod per generare form UI dinamici
 * Pattern riconosciuti: string, number, boolean, enum, array, object, date, email
 */

import { z } from 'zod';

export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'array'
  | 'object'
  | 'date'
  | 'email'
  | 'url'
  | 'textarea'
  | 'record'
  | 'resource'; // For pipeline/team/user selectors

export interface FieldMetadata {
  name: string;
  type: FieldType;
  label: string; // Auto-generated from field name (camelCase → Title Case)
  required: boolean;
  description?: string;
  defaultValue?: any;
  
  // Validations
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  
  // Enum-specific
  enumValues?: string[];
  
  // Array-specific
  itemType?: FieldType;
  minItems?: number;
  maxItems?: number;
  
  // Object-specific (nested fields)
  nestedFields?: Record<string, FieldMetadata>;
  
  // Resource-specific (pipeline, team, user selectors)
  resourceType?: 'pipeline' | 'team' | 'user' | 'store' | 'template';
}

export interface ParsedSchema {
  fields: Record<string, FieldMetadata>;
  hasNestedObjects: boolean;
  requiredFields: string[];
  optionalFields: string[];
}

/**
 * Converte camelCase in Title Case per label
 * Example: "approverType" → "Approver Type"
 */
function camelToTitle(str: string): string {
  const result = str.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Identifica tipo risorsa da nome campo
 * Pattern matching per riconoscere pipeline, team, user, etc.
 */
function detectResourceType(fieldName: string): 'pipeline' | 'team' | 'user' | 'store' | 'template' | null {
  const lower = fieldName.toLowerCase();
  
  if (lower.includes('pipeline')) return 'pipeline';
  if (lower.includes('team')) return 'team';
  if (lower.includes('user') || lower.includes('approver') || lower.includes('assignee')) return 'user';
  if (lower.includes('store')) return 'store';
  if (lower.includes('template')) return 'template';
  
  return null;
}

/**
 * Analizza singolo campo Zod e estrae metadata
 */
function parseZodField(
  fieldName: string,
  zodType: z.ZodTypeAny,
  isOptional: boolean = false
): FieldMetadata {
  const baseMetadata: FieldMetadata = {
    name: fieldName,
    type: 'string', // Default fallback
    label: camelToTitle(fieldName),
    required: !isOptional,
  };

  // Unwrap ZodOptional
  let unwrapped = zodType;
  if (zodType instanceof z.ZodOptional) {
    unwrapped = zodType.unwrap();
    baseMetadata.required = false;
  }

  // Unwrap ZodDefault
  if (unwrapped instanceof z.ZodDefault) {
    baseMetadata.defaultValue = unwrapped._def.defaultValue();
    unwrapped = unwrapped.removeDefault();
  }

  // String type
  if (unwrapped instanceof z.ZodString) {
    baseMetadata.type = 'string';
    
    // Check for email validation
    const checks = (unwrapped as any)._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'email') {
        baseMetadata.type = 'email';
      }
      if (check.kind === 'url') {
        baseMetadata.type = 'url';
      }
      if (check.kind === 'min') {
        baseMetadata.minLength = check.value;
      }
      if (check.kind === 'max') {
        baseMetadata.maxLength = check.value;
        // Se max > 100, usa textarea
        if (check.value > 100) {
          baseMetadata.type = 'textarea';
        }
      }
      if (check.kind === 'regex') {
        baseMetadata.pattern = check.regex.source;
      }
    }
    
    // Detect resource type
    const resourceType = detectResourceType(fieldName);
    if (resourceType) {
      baseMetadata.type = 'resource';
      baseMetadata.resourceType = resourceType;
    }
  }
  
  // Number type
  else if (unwrapped instanceof z.ZodNumber) {
    baseMetadata.type = 'number';
    const checks = (unwrapped as any)._def.checks || [];
    for (const check of checks) {
      if (check.kind === 'min') {
        baseMetadata.min = check.value;
      }
      if (check.kind === 'max') {
        baseMetadata.max = check.value;
      }
    }
  }
  
  // Boolean type
  else if (unwrapped instanceof z.ZodBoolean) {
    baseMetadata.type = 'boolean';
  }
  
  // Enum type
  else if (unwrapped instanceof z.ZodEnum) {
    baseMetadata.type = 'enum';
    baseMetadata.enumValues = unwrapped._def.values;
  }
  
  // Date type
  else if (unwrapped instanceof z.ZodDate) {
    baseMetadata.type = 'date';
  }
  
  // Array type
  else if (unwrapped instanceof z.ZodArray) {
    baseMetadata.type = 'array';
    const elementType = unwrapped._def.type;
    
    // Detect array item type
    if (elementType instanceof z.ZodString) {
      const checks = (elementType as any)._def.checks || [];
      const isEmail = checks.some((c: any) => c.kind === 'email');
      baseMetadata.itemType = isEmail ? 'email' : 'string';
    } else if (elementType instanceof z.ZodNumber) {
      baseMetadata.itemType = 'number';
    } else if (elementType instanceof z.ZodObject) {
      baseMetadata.itemType = 'object';
    }
    
    // Array validations
    const checks = (unwrapped as any)._def;
    if (checks.minLength) {
      baseMetadata.minItems = checks.minLength.value;
    }
    if (checks.maxLength) {
      baseMetadata.maxItems = checks.maxLength.value;
    }
  }
  
  // Object type (nested)
  else if (unwrapped instanceof z.ZodObject) {
    baseMetadata.type = 'object';
    baseMetadata.nestedFields = {};
    
    const shape = unwrapped._def.shape();
    for (const [key, value] of Object.entries(shape)) {
      baseMetadata.nestedFields[key] = parseZodField(
        key,
        value as z.ZodTypeAny,
        value instanceof z.ZodOptional
      );
    }
  }
  
  // Record type (key-value pairs)
  else if (unwrapped instanceof z.ZodRecord) {
    baseMetadata.type = 'record';
  }

  return baseMetadata;
}

/**
 * Parse completo dello schema Zod di un nodo
 */
export function parseConfigSchema(configSchema: z.ZodSchema<any>): ParsedSchema {
  const result: ParsedSchema = {
    fields: {},
    hasNestedObjects: false,
    requiredFields: [],
    optionalFields: [],
  };

  // Solo ZodObject è supportato come root
  if (!(configSchema instanceof z.ZodObject)) {
    console.warn('[ZodParser] Schema root non è un ZodObject, parsing limitato');
    return result;
  }

  const shape = configSchema._def.shape();

  for (const [fieldName, zodType] of Object.entries(shape)) {
    const fieldMeta = parseZodField(
      fieldName,
      zodType as z.ZodTypeAny,
      zodType instanceof z.ZodOptional
    );

    result.fields[fieldName] = fieldMeta;

    if (fieldMeta.required) {
      result.requiredFields.push(fieldName);
    } else {
      result.optionalFields.push(fieldName);
    }

    if (fieldMeta.type === 'object') {
      result.hasNestedObjects = true;
    }
  }

  return result;
}

/**
 * Helper per debug: stampa schema parsed in console
 */
export function debugParsedSchema(parsed: ParsedSchema) {
  console.group('🔍 Parsed Schema Debug');
  console.log('Required fields:', parsed.requiredFields);
  console.log('Optional fields:', parsed.optionalFields);
  console.log('Has nested objects:', parsed.hasNestedObjects);
  console.table(
    Object.entries(parsed.fields).map(([name, meta]) => ({
      name,
      type: meta.type,
      required: meta.required,
      default: meta.defaultValue,
    }))
  );
  console.groupEnd();
}
