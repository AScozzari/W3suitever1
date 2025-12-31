/**
 * 🎯 DEPARTMENTS CONSTANTS - Centralizzato per tutto il backend
 * 
 * Unica fonte di verità per i codici dei dipartimenti.
 * Usare queste costanti in tutti i Zod schemas e validazioni.
 */

import { z } from 'zod';

export const ALL_DEPARTMENT_CODES = [
  'hr',
  'finance', 
  'sales',
  'operations',
  'support',
  'crm',
  'marketing',
  'customer_service',
  'it',
  'wms'
] as const;

export type DepartmentCode = typeof ALL_DEPARTMENT_CODES[number];

export const departmentEnum = z.enum(ALL_DEPARTMENT_CODES);

export const departmentEnumOptional = departmentEnum.optional();

export const departmentEnumNullable = departmentEnum.nullable();

export const departmentArraySchema = z.array(departmentEnum);

export const DEPARTMENT_LABELS: Record<DepartmentCode, string> = {
  hr: 'Human Resources',
  finance: 'Finance',
  sales: 'Sales',
  operations: 'Operations',
  support: 'Support',
  crm: 'CRM',
  marketing: 'Marketing',
  customer_service: 'Assistenza Clienti',
  it: 'IT',
  wms: 'WMS'
};

export const DEPARTMENT_DESCRIPTIONS: Record<DepartmentCode, string> = {
  hr: 'Ferie, permessi, congedi, onboarding',
  finance: 'Expenses, budgets, payments, fatturazione',
  sales: 'Discount approvals, contract changes, deals',
  operations: 'Manutenzione, logistics, scheduling',
  support: 'Accessi, hardware, software, troubleshooting',
  crm: 'Customer relations, complaints, escalations',
  marketing: 'Campaigns, content, branding, eventi',
  customer_service: 'Assistenza clienti, reclami, supporto',
  it: 'Sistemi, infrastruttura, sicurezza',
  wms: 'Warehouse movements, inventory, approvals'
};

export function isDepartmentCode(code: string): code is DepartmentCode {
  return ALL_DEPARTMENT_CODES.includes(code as DepartmentCode);
}

export function getDepartmentLabel(code: string): string {
  return DEPARTMENT_LABELS[code as DepartmentCode] || code;
}

export function getDepartmentDescription(code: string): string {
  return DEPARTMENT_DESCRIPTIONS[code as DepartmentCode] || '';
}
