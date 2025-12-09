/**
 * 📦 WMS PRODUCT VERSIONING CONFIGURATION
 * 
 * Definisce quali campi triggerano il versioning del prodotto
 * e quali sono modifiche descrittive semplici.
 */

export const VERSIONING_FIELDS = [
  'monthlyFee',
  'unitPrice', 
  'costPrice'
] as const;

export const IDENTITY_FIELDS = [
  'sku',
  'ean',
  'type'
] as const;

export const DESCRIPTIVE_FIELDS = [
  'name',
  'description',
  'notes',
  'imageUrl',
  'color',
  'memory',
  'brand',
  'model',
  'status',
  'condition',
  'isSerializable',
  'serialType',
  'weight',
  'dimensions',
  'unitOfMeasure',
  'categoryId',
  'typeId',
  'validFrom',
  'validTo',
  'reorderPoint',
  'warehouseLocation'
] as const;

export type VersioningField = typeof VERSIONING_FIELDS[number];
export type IdentityField = typeof IDENTITY_FIELDS[number];
export type DescriptiveField = typeof DESCRIPTIVE_FIELDS[number];

export type ChangeType = 'descriptive' | 'versioning' | 'identity' | 'mixed';

export interface ChangeAnalysis {
  changeType: ChangeType;
  changedVersioningFields: string[];
  changedIdentityFields: string[];
  changedDescriptiveFields: string[];
  requiresVersioning: boolean;
  requiresIdentityConfirm: boolean;
}

export function analyzeProductChanges(
  currentProduct: Record<string, any>,
  updateData: Record<string, any>
): ChangeAnalysis {
  const changedVersioningFields: string[] = [];
  const changedIdentityFields: string[] = [];
  const changedDescriptiveFields: string[] = [];

  for (const [key, newValue] of Object.entries(updateData)) {
    const currentValue = currentProduct[key];
    
    const normalizedCurrent = normalizeValue(currentValue);
    const normalizedNew = normalizeValue(newValue);
    
    if (normalizedCurrent === normalizedNew) continue;

    if ((VERSIONING_FIELDS as readonly string[]).includes(key)) {
      changedVersioningFields.push(key);
    } else if ((IDENTITY_FIELDS as readonly string[]).includes(key)) {
      changedIdentityFields.push(key);
    } else if ((DESCRIPTIVE_FIELDS as readonly string[]).includes(key)) {
      changedDescriptiveFields.push(key);
    }
  }

  const hasVersioning = changedVersioningFields.length > 0;
  const hasIdentity = changedIdentityFields.length > 0;
  const hasDescriptive = changedDescriptiveFields.length > 0;

  let changeType: ChangeType;
  if (hasIdentity && hasVersioning) {
    changeType = 'mixed';
  } else if (hasIdentity) {
    changeType = 'identity';
  } else if (hasVersioning) {
    changeType = 'versioning';
  } else {
    changeType = 'descriptive';
  }

  return {
    changeType,
    changedVersioningFields,
    changedIdentityFields,
    changedDescriptiveFields,
    requiresVersioning: hasVersioning,
    requiresIdentityConfirm: hasIdentity
  };
}

function normalizeValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return JSON.stringify(value);
}

export const VERSIONING_INFO_TOOLTIP = `**Versioning vs Nuovo Prodotto**
- Modifiche a prezzi/canone creano una nuova **versione** dello stesso prodotto
- Lo storico rimane collegato per report e analisi
- Se cambi SKU, EAN o Tipo puoi scegliere se creare un **nuovo prodotto** o storicizzare
- Un nuovo prodotto avrà codici separati e non condivide lo storico`;
