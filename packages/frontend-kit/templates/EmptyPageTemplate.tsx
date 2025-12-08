import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';
import { 
  FileX,
  Search,
  Users,
  FolderOpen,
  Package,
  Database,
  AlertCircle,
  Plus,
  Upload,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  FileText,
  Image
} from 'lucide-react';

export interface EmptyAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

export interface EmptyPageTemplateProps {
  // Main Content
  title: string;
  description?: string;
  icon?: React.ReactNode;
  
  // Actions
  primaryAction?: EmptyAction;
  secondaryActions?: EmptyAction[];
  
  // Help/Support
  helpTitle?: string;
  helpItems?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
  }>;
  
  // Suggestions
  suggestedTitle?: string;
  suggestedItems?: Array<{
    title: string;
    description: string;
    icon?: React.ReactNode;
    onClick?: () => void;
  }>;
  
  // Layout
  variant?: 'default' | 'card' | 'minimal' | 'illustrated';
  size?: 'sm' | 'md' | 'lg' | 'full';
  illustration?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

// Default icons for common empty states
export const EmptyIcons = {
  noData: <Database className="h-12 w-12 text-gray-400" />,
  noResults: <Search className="h-12 w-12 text-gray-400" />,
  noFiles: <FileX className="h-12 w-12 text-gray-400" />,
  noUsers: <Users className="h-12 w-12 text-gray-400" />,
  noFolder: <FolderOpen className="h-12 w-12 text-gray-400" />,
  noPackage: <Package className="h-12 w-12 text-gray-400" />,
  error: <AlertCircle className="h-12 w-12 text-red-400" />,
  noDocuments: <FileText className="h-12 w-12 text-gray-400" />,
  noImages: <Image className="h-12 w-12 text-gray-400" />
};

export function EmptyPageTemplate({
  title,
  description,
  icon = EmptyIcons.noData,
  primaryAction,
  secondaryActions = [],
  helpTitle = 'Need help?',
  helpItems = [],
  suggestedTitle = 'Suggestions',
  suggestedItems = [],
  variant = 'default',
  size = 'md',
  illustration,
  className = '',
  children,
}: EmptyPageTemplateProps) {
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-lg';
      case 'full':
        return 'w-full';
      default:
        return 'max-w-md';
    }
  };

  const emptyContent = (
    <>
      {/* Icon/Illustration */}
      <div className="flex justify-center mb-6">
        {variant === 'illustrated' && illustration ? (
          <div className="w-64 h-64">{illustration}</div>
        ) : (
          <div className="rounded-full bg-gray-100 p-6">{icon}</div>
        )}
      </div>

      {/* Title & Description */}
      <div className="text-center space-y-2 mb-6">
        <h3 className="text-lg font-semibold text-gray-900" data-testid="empty-title">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600" data-testid="empty-description">
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(primaryAction || secondaryActions.length > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          {primaryAction && (
            <Button
              variant={primaryAction.variant || 'default'}
              onClick={primaryAction.onClick}
              data-testid="button-primary"
            >
              {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
              {primaryAction.label}
            </Button>
          )}
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'outline'}
              onClick={action.onClick}
              data-testid={`button-secondary-${index}`}
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Suggested Items */}
      {suggestedItems.length > 0 && (
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">
            {suggestedTitle}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestedItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-gray-50"
                data-testid={`suggested-item-${index}`}
              >
                {item.icon && (
                  <div className="mt-0.5 text-gray-400">{item.icon}</div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Help Links */}
      {helpItems.length > 0 && (
        <div className="border-t pt-6">
          <p className="text-sm text-gray-600 text-center mb-3">{helpTitle}</p>
          <div className="flex items-center justify-center gap-4">
            {helpItems.map((item, index) => (
              <div key={index}>
                {item.href ? (
                  <a
                    href={item.href}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    data-testid={`help-link-${index}`}
                  >
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                ) : (
                  <button
                    onClick={item.onClick}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    data-testid={`help-button-${index}`}
                  >
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Content */}
      {children}
    </>
  );

  const containerClass = cn(
    'mx-auto',
    getSizeClass(),
    variant === 'minimal' ? 'py-12' : 'py-16',
    className
  );

  if (variant === 'card') {
    return (
      <div className={containerClass} data-testid="empty-page-template">
        <Card className="glass-card">
          <CardContent className="p-8">
            {emptyContent}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={containerClass} data-testid="empty-page-template">
      {emptyContent}
    </div>
  );
}

// Preset empty states for common scenarios
export const NoDataEmpty = (props: Omit<EmptyPageTemplateProps, 'icon' | 'title'>) => (
  <EmptyPageTemplate
    {...props}
    icon={EmptyIcons.noData}
    title="No data yet"
    description="Get started by adding your first item"
  />
);

export const NoResultsEmpty = (props: Omit<EmptyPageTemplateProps, 'icon' | 'title'>) => (
  <EmptyPageTemplate
    {...props}
    icon={EmptyIcons.noResults}
    title="No results found"
    description="Try adjusting your search or filter criteria"
  />
);

export const NoFilesEmpty = (props: Omit<EmptyPageTemplateProps, 'icon' | 'title'>) => (
  <EmptyPageTemplate
    {...props}
    icon={EmptyIcons.noFiles}
    title="No files uploaded"
    description="Upload your first file to get started"
    primaryAction={{
      label: 'Upload File',
      icon: <Upload className="h-4 w-4" />,
      onClick: () => {}
    }}
  />
);

export const NoUsersEmpty = (props: Omit<EmptyPageTemplateProps, 'icon' | 'title'>) => (
  <EmptyPageTemplate
    {...props}
    icon={EmptyIcons.noUsers}
    title="No users found"
    description="Invite team members to collaborate"
    primaryAction={{
      label: 'Invite Users',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => {}
    }}
  />
);

export const ErrorEmpty = (props: Omit<EmptyPageTemplateProps, 'icon' | 'title'>) => (
  <EmptyPageTemplate
    {...props}
    icon={EmptyIcons.error}
    title="Something went wrong"
    description="We couldn't load the data. Please try again."
    primaryAction={{
      label: 'Retry',
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: () => {}
    }}
    secondaryActions={[
      {
        label: 'Get Help',
        icon: <HelpCircle className="h-4 w-4" />,
        variant: 'outline',
        onClick: () => {}
      }
    ]}
  />
);

// Helper component for creating custom empty states
export function createEmptyState(config: EmptyPageTemplateProps) {
  return () => <EmptyPageTemplate {...config} />;
}