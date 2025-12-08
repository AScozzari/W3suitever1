import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Action {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
  hidden?: boolean;
}

export interface ActionGroup {
  label?: string;
  actions: Action[];
}

export interface ActionBarProps {
  actions?: Action[];
  actionGroups?: ActionGroup[];
  selectedCount?: number;
  onClearSelection?: () => void;
  variant?: 'default' | 'compact' | 'floating';
  position?: 'top' | 'bottom' | 'sticky';
  className?: string;
}

export function ActionBar({
  actions = [],
  actionGroups = [],
  selectedCount = 0,
  onClearSelection,
  variant = 'default',
  position = 'top',
  className = '',
}: ActionBarProps) {
  // Filter visible actions
  const visibleActions = actions.filter((a) => !a.hidden);
  const primaryActions = visibleActions.slice(0, 3);
  const moreActions = visibleActions.slice(3);

  const getContainerStyles = () => {
    const base = 'flex items-center justify-between gap-4 px-4 py-3';
    
    switch (variant) {
      case 'compact':
        return cn(base, 'py-2');
      case 'floating':
        return cn(base, 'rounded-lg shadow-lg border bg-white');
      default:
        return cn(base, 'border-b bg-gray-50');
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom':
        return 'mt-auto';
      case 'sticky':
        return 'sticky top-0 z-10';
      default:
        return '';
    }
  };

  return (
    <div
      className={cn(
        getContainerStyles(),
        getPositionStyles(),
        className
      )}
      data-testid="action-bar"
    >
      {/* Selection Info */}
      <div className="flex items-center gap-3">
        {selectedCount > 0 && (
          <>
            <Badge variant="secondary" data-testid="badge-selection-count">
              {selectedCount} selected
            </Badge>
            {onClearSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                data-testid="button-clear-selection"
              >
                Clear
              </Button>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Individual Actions */}
        {primaryActions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            size={variant === 'compact' ? 'sm' : 'default'}
            onClick={action.onClick}
            disabled={action.disabled}
            data-testid={`button-action-${action.id}`}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
              {action.label}
            </span>
          </Button>
        ))}

        {/* Action Groups */}
        {actionGroups.map((group, groupIndex) => (
          <DropdownMenu key={groupIndex}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size={variant === 'compact' ? 'sm' : 'default'}
                data-testid={`button-group-${groupIndex}`}
              >
                {group.label || 'Actions'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {group.label && (
                <>
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              {group.actions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  data-testid={`menu-item-${action.id}`}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        {/* More Actions */}
        {moreActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-more-actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {moreActions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  data-testid={`menu-item-more-${action.id}`}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Preset action bars for common use cases
export const TableActionBar = (props: Omit<ActionBarProps, 'variant'>) => (
  <ActionBar {...props} variant="default" />
);

export const FloatingActionBar = (props: Omit<ActionBarProps, 'variant' | 'position'>) => (
  <ActionBar {...props} variant="floating" position="sticky" />
);

export const CompactActionBar = (props: Omit<ActionBarProps, 'variant'>) => (
  <ActionBar {...props} variant="compact" />
);