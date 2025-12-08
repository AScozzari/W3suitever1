import { Building2, Store, Globe } from 'lucide-react';
import { Badge } from './badge';

export type ScopeType = 'tenant' | 'legal_entity' | 'store';

interface ScopeBadgeProps {
  scopeType: ScopeType;
  scopeName?: string;
  className?: string;
}

export function ScopeBadge({ scopeType, scopeName, className }: ScopeBadgeProps) {
  const scopeConfig = {
    tenant: {
      icon: Globe,
      label: 'Tenant',
      variant: 'default' as const,
      className: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 dark:from-purple-400/20 dark:to-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300/50 dark:border-purple-500/50'
    },
    legal_entity: {
      icon: Building2,
      label: 'Legal Entity',
      variant: 'secondary' as const,
      className: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 dark:from-orange-400/20 dark:to-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-300/50 dark:border-orange-500/50'
    },
    store: {
      icon: Store,
      label: 'Store',
      variant: 'outline' as const,
      className: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 dark:from-blue-400/20 dark:to-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300/50 dark:border-blue-500/50'
    }
  };

  const config = scopeConfig[scopeType];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className || ''} gap-1 px-2 py-0.5`}
      data-testid={`badge-scope-${scopeType}`}
    >
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">
        {scopeName || config.label}
      </span>
    </Badge>
  );
}
