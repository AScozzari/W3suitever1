/**
 * 🔍 ZOD SCHEMA PARSER (Enhanced v2)
 * 
 * Estrae metadata da schema Zod per generare form UI dinamici
 * Supporta: string, number, boolean, enum, array, object, date, email, url, 
 *           unions, literals, nullable, effects, record values
 * 
 * Enhancement:
 * - Unwrap: ZodNullable, ZodEffects, ZodPipeline, unions, discriminatedUnion
 * - Capture: _def.description, default values, field order
 * - Metadata hooks: .describe('component:condition-builder') per componenti speciali
 * - Unsupported constructs: flagged per JSON fallback
 */

import { z } from 'zod';

export type FieldType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'literal'
  | 'array'
  | 'object'
  | 'date'
  | 'email'
  | 'url'
  | 'textarea'
  | 'record'
  | 'resource'  // For pipeline/team/user selectors
  | 'union'     // z.union/discriminatedUnion
  | 'unsupported'; // Fallback to JSON editor

export interface FieldMetadata {
  name: string;
  type: FieldType;
  label: string; // Auto-generated from field name (camelCase → Title Case)
  required: boolean;
  nullable: boolean; // Track .nullable() wrapper
  description?: string; // From _def.description
  defaultValue?: any;
  
  // Metadata hooks (from .describe('component:xxx'))
  componentHint?: string; // 'condition-builder', 'template-selector', etc.
  
  // Validations
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  
  // Enum-specific
  enumValues?: (string | number)[];
  
  // Literal-specific
  literalValue?: string | number | boolean;
  
  // Array-specific
  itemType?: FieldType;
  itemSchema?: FieldMetadata; // For array of objects/enums
  minItems?: number;
  maxItems?: number;
  
  // Object-specific (nested fields)
  nestedFields?: Record<string, FieldMetadata>;
  
  // Record-specific
  recordValueType?: FieldType;
  recordValueSchema?: FieldMetadata; // Schema dei valori nel record
  
  // Union-specific
  unionOptions?: FieldMetadata[];
  discriminator?: string; // For discriminatedUnion
  
  // Resource-specific (pipeline, team, user selectors)
  resourceType?: 'pipeline' | 'team' | 'user' | 'store' | 'template';
}

export interface ParsedSchema {
  fields: Record<string, FieldMetadata>;
  fieldOrder: string[]; // Preserve field order
  hasNestedObjects: boolean;
  requiredFields: string[];
  optionalFields: string[];
  unsupportedFields: string[]; // Fields that need JSON fallback
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
 * Estrae component hint da description metadata
 * Example: .describe('component:condition-builder') → 'condition-builder'
 */
function extractComponentHint(description?: string): string | undefined {
  if (!description) return undefined;
  const match = description.match(/component:([a-z-]+)/i);
  return match ? match[1] : undefined;
}

/**
 * Identifica tipo risorsa da nome campo (fallback heuristic)
 * DEPRECATED: Usare .describe('component:pipeline-selector') invece
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
 * Analizza singolo campo Zod e estrae metadata (Enhanced v2)
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
    nullable: false,
  };

  // Capture description from _def
  const description = (zodType as any)._def?.description;
  if (description) {
    baseMetadata.description = description;
    
    // Extract component hint from description
    const componentHint = extractComponentHint(description);
    if (componentHint) {
      baseMetadata.componentHint = componentHint;
    }
  }

  // Unwrap layers (order matters!)
  let unwrapped = zodType;
  
  // 1. Unwrap ZodOptional
  if (unwrapped instanceof z.ZodOptional) {
    unwrapped = unwrapped.unwrap();
    baseMetadata.required = false;
  }
  
  // 2. Unwrap ZodNullable
  if (unwrapped instanceof z.ZodNullable) {
    unwrapped = unwrapped.unwrap();
    baseMetadata.nullable = true;
  }
  
  // 3. Unwrap ZodDefault
  if (unwrapped instanceof z.ZodDefault) {
    baseMetadata.defaultValue = unwrapped._def.defaultValue();
    unwrapped = unwrapped.removeDefault();
  }
  
  // 4. Unwrap ZodEffects (transform/refine) - extract inner schema
  if (unwrapped instanceof z.ZodEffects) {
    unwrapped = unwrapped.innerType();
  }
  
  // 5. Unwrap ZodPipeline - use output schema
  if ((unwrapped as any)._def?.typeName === 'ZodPipeline') {
    unwrapped = (unwrapped as any)._def.out;
  }

  // === PRIMITIVE TYPES ===
  
  // String type
  if (unwrapped instanceof z.ZodString) {
    baseMetadata.type = 'string';
    
    // Check for email/url validation
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
    
    // Detect resource type (fallback heuristic)
    const resourceType = detectResourceType(fieldName);
    if (resourceType && !baseMetadata.componentHint) {
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
  
  // Date type
  else if (unwrapped instanceof z.ZodDate) {
    baseMetadata.type = 'date';
  }
  
  // === ENUM & LITERAL TYPES ===
  
  // Enum type (z.enum)
  else if (unwrapped instanceof z.ZodEnum) {
    baseMetadata.type = 'enum';
    baseMetadata.enumValues = unwrapped._def.values;
  }
  
  // Native Enum type (z.nativeEnum)
  else if ((unwrapped as any)._def?.typeName === 'ZodNativeEnum') {
    baseMetadata.type = 'enum';
    const enumObj = (unwrapped as any)._def.values;
    baseMetadata.enumValues = Object.values(enumObj);
  }
  
  // Literal type (z.literal)
  else if (unwrapped instanceof z.ZodLiteral) {
    baseMetadata.type = 'literal';
    baseMetadata.literalValue = unwrapped._def.value;
  }
  
  // === COMPLEX TYPES ===
  
  // Array type
  else if (unwrapped instanceof z.ZodArray) {
    baseMetadata.type = 'array';
    const elementType = unwrapped._def.type;
    
    // Parse array item schema recursively
    const itemMeta = parseZodField('item', elementType, false);
    baseMetadata.itemType = itemMeta.type;
    
    // Store full item schema for complex types (objects, enums)
    if (itemMeta.type === 'object' || itemMeta.type === 'enum') {
      baseMetadata.itemSchema = itemMeta;
    }
    
    // Array validations
    const arrayDef = (unwrapped as any)._def;
    if (arrayDef.minLength) {
      baseMetadata.minItems = arrayDef.minLength.value;
    }
    if (arrayDef.maxLength) {
      baseMetadata.maxItems = arrayDef.maxLength.value;
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
    
    // Parse value schema
    const valueType = (unwrapped as any)._def.valueType;
    if (valueType) {
      const valueMeta = parseZodField('value', valueType, false);
      baseMetadata.recordValueType = valueMeta.type;
      baseMetadata.recordValueSchema = valueMeta;
    }
  }
  
  // === UNION TYPES ===
  
  // Union type (z.union)
  else if ((unwrapped as any)._def?.typeName === 'ZodUnion') {
    baseMetadata.type = 'union';
    const options = (unwrapped as any)._def.options || [];
    baseMetadata.unionOptions = options.map((opt: z.ZodTypeAny, idx: number) =>
      parseZodField(`option_${idx}`, opt, false)
    );
  }
  
  // Discriminated Union (z.discriminatedUnion)
  else if ((unwrapped as any)._def?.typeName === 'ZodDiscriminatedUnion') {
    baseMetadata.type = 'union';
    baseMetadata.discriminator = (unwrapped as any)._def.discriminator;
    const options = Array.from((unwrapped as any)._def.optionsMap.values());
    baseMetadata.unionOptions = options.map((opt: z.ZodTypeAny, idx: number) =>
      parseZodField(`option_${idx}`, opt, false)
    );
  }
  
  // === UNSUPPORTED FALLBACK ===
  
  // Unknown/unsupported types → flag for JSON editor
  else {
    baseMetadata.type = 'unsupported';
    console.warn(`[ZodParser] Unsupported type for field "${fieldName}":`, (unwrapped as any)._def?.typeName);
  }

  return baseMetadata;
}

/**
 * Parse completo dello schema Zod di un nodo (Enhanced v2)
 * - Preserva field order
 * - Traccia unsupported fields
 * - Cattura descriptions e component hints
 */
export function parseConfigSchema(configSchema: z.ZodSchema<any>): ParsedSchema {
  const result: ParsedSchema = {
    fields: {},
    fieldOrder: [],
    hasNestedObjects: false,
    requiredFields: [],
    optionalFields: [],
    unsupportedFields: [],
  };

  // Solo ZodObject è supportato come root
  if (!(configSchema instanceof z.ZodObject)) {
    console.warn('[ZodParser] Schema root non è un ZodObject, parsing limitato');
    return result;
  }

  const shape = configSchema._def.shape();

  // Preserve field order (Object.keys mantiene l'ordine di inserzione)
  for (const [fieldName, zodType] of Object.entries(shape)) {
    result.fieldOrder.push(fieldName);
    
    const fieldMeta = parseZodField(
      fieldName,
      zodType as z.ZodTypeAny,
      zodType instanceof z.ZodOptional
    );

    result.fields[fieldName] = fieldMeta;

    // Track field categories
    if (fieldMeta.required) {
      result.requiredFields.push(fieldName);
    } else {
      result.optionalFields.push(fieldName);
    }

    if (fieldMeta.type === 'object') {
      result.hasNestedObjects = true;
    }
    
    // Track unsupported fields for JSON fallback
    if (fieldMeta.type === 'unsupported') {
      result.unsupportedFields.push(fieldName);
    }
  }

  return result;
}

/**
 * Helper per debug: stampa schema parsed in console (Enhanced v2)
 */
export function debugParsedSchema(parsed: ParsedSchema) {
  console.group('🔍 Parsed Schema Debug (Enhanced v2)');
  console.log('Field order:', parsed.fieldOrder);
  console.log('Required fields:', parsed.requiredFields);
  console.log('Optional fields:', parsed.optionalFields);
  console.log('Unsupported fields (→ JSON fallback):', parsed.unsupportedFields);
  console.log('Has nested objects:', parsed.hasNestedObjects);
  console.table(
    parsed.fieldOrder.map(name => {
      const meta = parsed.fields[name];
      return {
        name,
        type: meta.type,
        required: meta.required,
        nullable: meta.nullable,
        default: meta.defaultValue,
        hint: meta.componentHint || '—',
        description: meta.description ? `${meta.description.substring(0, 40)}...` : '—',
      };
    })
  );
  console.groupEnd();
}
