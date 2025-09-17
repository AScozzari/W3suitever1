import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import * as React from 'react';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: PageHeaderAction;
  secondaryActions?: PageHeaderAction[];
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  showBackButton,
  onBack,
  className = '',
  children,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)} data-testid="page-header">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <span className="text-gray-400">/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  data-testid={`breadcrumb-link-${index}`}
                >
                  {crumb.label}
                </a>
              ) : crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                  data-testid={`breadcrumb-button-${index}`}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-gray-900" data-testid={`breadcrumb-text-${index}`}>
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Main Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          {/* Back Button */}
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mt-1"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {/* Title Section */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight" data-testid="page-title">
                {title}
              </h1>
              {badge && (
                <Badge variant={badge.variant || 'default'} data-testid="page-badge">
                  {badge.label}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-gray-600" data-testid="page-subtitle">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {secondaryActions && secondaryActions.length > 0 && (
            <>
              {secondaryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  data-testid={`button-secondary-${index}`}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
              {secondaryActions.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-more"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {primaryAction && (
            <Button
              variant={primaryAction.variant || 'default'}
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              data-testid="button-primary"
            >
              {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>

      {/* Custom Content */}
      {children && (
        <>
          <Separator />
          <div>{children}</div>
        </>
      )}
    </div>
  );
}

// Preset variants
export const SimplePageHeader = (props: Pick<PageHeaderProps, 'title' | 'subtitle'>) => (
  <PageHeader {...props} />
);

export const ActionPageHeader = (props: PageHeaderProps) => (
  <PageHeader {...props} className="glass-panel rounded-lg" />
);