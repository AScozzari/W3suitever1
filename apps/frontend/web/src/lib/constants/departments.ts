/**
 * 🎯 DEPARTMENTS CONSTANTS - Centralizzato per tutta l'app
 * 
 * Icone e colori per i dipartimenti. I dati dei dipartimenti
 * vengono dal database via /api/action-configurations/meta/departments
 */

import { z } from 'zod';
import { 
  Users, 
  DollarSign, 
  Building2, 
  HeadphonesIcon, 
  Settings,
  TrendingUp,
  Megaphone,
  Package,
  type LucideIcon
} from 'lucide-react';

export interface DepartmentStyle {
  icon: LucideIcon;
  label: string;
  color: string;
  textColor: string;
  borderColor?: string;
}

export const DEPARTMENT_STYLES: Record<string, DepartmentStyle> = {
  'hr': { 
    icon: Users, 
    label: 'HR', 
    color: 'bg-windtre-purple/10', 
    textColor: 'text-windtre-purple', 
    borderColor: 'border-windtre-purple/20' 
  },
  'finance': { 
    icon: DollarSign, 
    label: 'Finance', 
    color: 'bg-windtre-orange/10', 
    textColor: 'text-windtre-orange', 
    borderColor: 'border-windtre-orange/20' 
  },
  'sales': { 
    icon: TrendingUp, 
    label: 'Sales', 
    color: 'bg-windtre-purple/10', 
    textColor: 'text-windtre-purple', 
    borderColor: 'border-windtre-purple/20' 
  },
  'operations': { 
    icon: Settings, 
    label: 'Operations', 
    color: 'bg-windtre-orange/10', 
    textColor: 'text-windtre-orange', 
    borderColor: 'border-windtre-orange/20' 
  },
  'support': { 
    icon: HeadphonesIcon, 
    label: 'Support', 
    color: 'bg-windtre-purple/10', 
    textColor: 'text-windtre-purple', 
    borderColor: 'border-windtre-purple/20' 
  },
  'crm': { 
    icon: Users, 
    label: 'CRM', 
    color: 'bg-windtre-orange/10', 
    textColor: 'text-windtre-orange', 
    borderColor: 'border-windtre-orange/20' 
  },
  'marketing': { 
    icon: Megaphone, 
    label: 'Marketing', 
    color: 'bg-windtre-purple/10', 
    textColor: 'text-windtre-purple', 
    borderColor: 'border-windtre-purple/20' 
  },
  'customer_service': { 
    icon: HeadphonesIcon, 
    label: 'Assistenza Clienti', 
    color: 'bg-windtre-purple/10', 
    textColor: 'text-windtre-purple', 
    borderColor: 'border-windtre-purple/20' 
  },
  'it': { 
    icon: Settings, 
    label: 'IT', 
    color: 'bg-windtre-orange/10', 
    textColor: 'text-windtre-orange', 
    borderColor: 'border-windtre-orange/20' 
  },
  'wms': { 
    icon: Package, 
    label: 'WMS', 
    color: 'bg-windtre-orange/10', 
    textColor: 'text-windtre-orange', 
    borderColor: 'border-windtre-orange/20' 
  }
};

export const TEAM_TYPES = {
  'functional': { 
    label: 'Funzionale', 
    description: 'Team primario per dipartimento',
    exclusive: true,
    warning: 'Un utente può appartenere a max 1 team funzionale per dipartimento',
    icon: '🔒'
  },
  'cross_functional': { 
    label: 'Cross-Funzionale', 
    description: 'Team multi-dipartimento',
    exclusive: false,
    icon: '🔗'
  },
  'project': { 
    label: 'Progetto', 
    description: 'Team temporanei per progetto specifico',
    exclusive: false,
    icon: '📋'
  },
  'temporary': { 
    label: 'Temporaneo', 
    description: 'Team con scadenza definita',
    exclusive: false,
    icon: '⏳'
  },
  'specialized': { 
    label: 'Specializzato', 
    description: 'Team per competenze specifiche',
    exclusive: false,
    icon: '⭐'
  }
} as const;

export type TeamType = keyof typeof TEAM_TYPES;
export type DepartmentCode = keyof typeof DEPARTMENT_STYLES;

export const ALL_DEPARTMENT_CODES = [
  'hr', 'finance', 'sales', 'operations', 'support', 'crm', 'marketing', 'customer_service', 'it', 'wms'
] as const;

export const departmentEnum = z.enum(ALL_DEPARTMENT_CODES);
export type DepartmentEnumType = z.infer<typeof departmentEnum>;

export function getDepartmentStyle(code: string): DepartmentStyle {
  return DEPARTMENT_STYLES[code] || {
    icon: Building2,
    label: code,
    color: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200'
  };
}
