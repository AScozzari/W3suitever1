import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { 
  FileX, 
  Search, 
  Package, 
  Users, 
  FolderOpen,
  Database,
  AlertCircle 
} from 'lucide-react';

export type EmptyStateIcon = 'file' | 'search' | 'package' | 'users' | 'folder' | 'database' | 'alert' | React.ReactNode;

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary';
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: EmptyStateIcon;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: 'default' | 'compact' | 'centered';
  className?: string;
}

const iconMap = {
  file: FileX,
  search: Search,
  package: Package,
  users: Users,
  folder: FolderOpen,
  database: Database,
  alert: AlertCircle,
};

export function EmptyState({
  title,
  description,
  icon = 'package',
  primaryAction,
  secondaryAction,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  const getIcon = () => {
    if (typeof icon === 'string' && icon in iconMap) {
      const IconComponent = iconMap[icon as keyof typeof iconMap];
      return <IconComponent className="h-12 w-12 text-gray-400" />;
    }
    return icon;
  };

  const getContainerStyles = () => {
    switch (variant) {
      case 'compact':
        return 'py-6';
      case 'centered':
        return 'py-12 min-h-[400px] flex items-center justify-center';
      default:
        return 'py-8';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        getContainerStyles(),
        className
      )}
      data-testid="empty-state"
    >
      {/* Icon */}
      {icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-4" data-testid="empty-state-icon">
          {getIcon()}
        </div>
      )}

      {/* Text Content */}
      <div className="max-w-sm space-y-2">
        <h3 className="text-lg font-semibold text-gray-900" data-testid="empty-state-title">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600" data-testid="empty-state-description">
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
          {primaryAction && (
            <Button
              variant={primaryAction.variant || 'default'}
              onClick={primaryAction.onClick}
              data-testid="button-primary-action"
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'outline'}
              onClick={secondaryAction.onClick}
              data-testid="button-secondary-action"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export const NoDataEmptyState = () => (
  <EmptyState
    icon="database"
    title="No data yet"
    description="Get started by adding your first item."
    primaryAction={{
      label: "Add Item",
      onClick: () => console.log("Add item clicked"),
    }}
  />
);

export const NoSearchResultsEmptyState = ({ searchTerm }: { searchTerm: string }) => (
  <EmptyState
    icon="search"
    title="No results found"
    description={`We couldn't find any results for "${searchTerm}". Try adjusting your search.`}
    primaryAction={{
      label: "Clear Search",
      variant: "outline",
      onClick: () => console.log("Clear search clicked"),
    }}
  />
);

export const ErrorEmptyState = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    icon="alert"
    title="Something went wrong"
    description="We encountered an error while loading this content."
    primaryAction={{
      label: "Try Again",
      onClick: onRetry,
    }}
  />
);

export const UnauthorizedEmptyState = () => (
  <EmptyState
    icon="alert"
    title="Access Denied"
    description="You don't have permission to view this content."
    primaryAction={{
      label: "Go Back",
      variant: "outline",
      onClick: () => window.history.back(),
    }}
  />
);