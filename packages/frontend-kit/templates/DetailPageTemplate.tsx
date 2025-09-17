import { useState } from 'react';
import { PageHeader, PageHeaderProps } from '../components/blocks/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import { cn } from '../lib/utils';
import { 
  Edit,
  Trash2,
  Share2,
  Download,
  MoreVertical,
  Clock,
  User,
  Calendar,
  Tag,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

export interface InfoField {
  label: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  copyable?: boolean;
}

export interface InfoSection {
  id: string;
  title: string;
  description?: string;
  fields: InfoField[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  content: React.ReactNode;
}

export interface RelatedEntity {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
}

export interface DetailPageTemplateProps {
  // Page Header
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
  breadcrumbs?: PageHeaderProps['breadcrumbs'];
  showBackButton?: boolean;
  onBack?: () => void;
  
  // Header Actions
  primaryAction?: PageHeaderProps['primaryAction'];
  secondaryActions?: PageHeaderProps['secondaryActions'];
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  
  // Info Sections
  infoSections?: InfoSection[];
  
  // Tabs
  tabs?: TabItem[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
  
  // Related Entities
  relatedTitle?: string;
  relatedEntities?: RelatedEntity[];
  showRelatedViewAll?: boolean;
  onRelatedViewAll?: () => void;
  
  // Metadata
  metadata?: {
    createdAt?: Date | string;
    createdBy?: string;
    updatedAt?: Date | string;
    updatedBy?: string;
    tags?: string[];
  };
  
  // States
  isLoading?: boolean;
  error?: Error | string | null;
  
  // Layout
  variant?: 'default' | 'sidebar' | 'tabs' | 'compact';
  className?: string;
  children?: React.ReactNode;
}

export function DetailPageTemplate({
  title,
  subtitle,
  badge,
  breadcrumbs,
  showBackButton,
  onBack,
  primaryAction,
  secondaryActions = [],
  onEdit,
  onDelete,
  onShare,
  onExport,
  infoSections = [],
  tabs = [],
  defaultTab,
  onTabChange,
  relatedTitle = 'Related Items',
  relatedEntities = [],
  showRelatedViewAll = false,
  onRelatedViewAll,
  metadata,
  isLoading = false,
  error = null,
  variant = 'default',
  className = '',
  children,
}: DetailPageTemplateProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(infoSections.filter(s => s.defaultCollapsed).map(s => s.id))
  );

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(d);
  };

  // Build secondary actions
  const allSecondaryActions = [
    ...(onEdit ? [{ label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: onEdit }] : []),
    ...(onShare ? [{ label: 'Share', icon: <Share2 className="h-4 w-4" />, onClick: onShare }] : []),
    ...(onExport ? [{ label: 'Export', icon: <Download className="h-4 w-4" />, onClick: onExport }] : []),
    ...secondaryActions,
    ...(onDelete ? [{ label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: onDelete, variant: 'destructive' as const }] : []),
  ];

  const infoContent = (
    <div className="space-y-6">
      {/* Info Sections */}
      {infoSections.map((section) => (
        <Card key={section.id} className="glass-card" data-testid={`info-section-${section.id}`}>
          <CardHeader
            className={section.collapsible ? 'cursor-pointer' : ''}
            onClick={section.collapsible ? () => toggleSection(section.id) : undefined}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{section.title}</CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </div>
              {section.collapsible && (
                <ChevronRight
                  className={cn(
                    'h-5 w-5 transition-transform',
                    !collapsedSections.has(section.id) && 'rotate-90'
                  )}
                />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.has(section.id) && (
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {section.fields.map((field, index) => (
                  <div key={index} className="space-y-1" data-testid={`field-${field.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <dt className="flex items-center gap-2 text-sm text-gray-500">
                      {field.icon && <span>{field.icon}</span>}
                      {field.label}
                    </dt>
                    <dd className="text-sm font-medium">
                      {field.value}
                      {field.copyable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 px-2"
                          onClick={() => navigator.clipboard.writeText(String(field.value))}
                          data-testid={`button-copy-${index}`}
                        >
                          Copy
                        </Button>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          )}
        </Card>
      ))}

      {/* Metadata */}
      {metadata && (
        <Card className="glass-card" data-testid="metadata-section">
          <CardHeader>
            <CardTitle className="text-base">Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metadata.createdAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Created</span>
                  <span className="font-medium">{formatDate(metadata.createdAt)}</span>
                  {metadata.createdBy && (
                    <>
                      <span className="text-gray-500">by</span>
                      <span className="font-medium">{metadata.createdBy}</span>
                    </>
                  )}
                </div>
              )}
              {metadata.updatedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Updated</span>
                  <span className="font-medium">{formatDate(metadata.updatedAt)}</span>
                  {metadata.updatedBy && (
                    <>
                      <span className="text-gray-500">by</span>
                      <span className="font-medium">{metadata.updatedBy}</span>
                    </>
                  )}
                </div>
              )}
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-400" />
                  <div className="flex flex-wrap gap-2">
                    {metadata.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Entities */}
      {relatedEntities.length > 0 && (
        <Card className="glass-card" data-testid="related-section">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{relatedTitle}</CardTitle>
              {showRelatedViewAll && onRelatedViewAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRelatedViewAll}
                  data-testid="button-related-view-all"
                >
                  View All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relatedEntities.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  data-testid={`related-entity-${entity.id}`}
                >
                  <div className="flex items-center gap-3">
                    {entity.icon && (
                      <div className="text-gray-400">{entity.icon}</div>
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {entity.href ? (
                          <a href={entity.href} className="hover:underline">
                            {entity.title}
                          </a>
                        ) : entity.onClick ? (
                          <button onClick={entity.onClick} className="hover:underline">
                            {entity.title}
                          </button>
                        ) : (
                          entity.title
                        )}
                      </p>
                      {entity.subtitle && (
                        <p className="text-sm text-gray-500">{entity.subtitle}</p>
                      )}
                    </div>
                  </div>
                  {entity.badge && (
                    <Badge variant={entity.badge.variant || 'default'}>
                      {entity.badge.label}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Content */}
      {children}
    </div>
  );

  const tabContent = variant === 'tabs' && tabs.length > 0 && (
    <>
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
              data-testid={`tab-${tab.id}`}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
              {tab.badge && (
                <Badge variant="secondary" className="ml-2">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </>
  );

  const sidebarContent = variant === 'sidebar' && (
    <div className="flex gap-6">
      <div className="flex-1">{infoContent}</div>
      <aside className="w-80 space-y-4">
        {/* Actions Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allSecondaryActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  className="w-full justify-start"
                  onClick={action.onClick}
                  data-testid={`button-action-${index}`}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        {metadata && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {metadata.createdAt && (
                  <div>
                    <span className="text-gray-500">Created</span>
                    <p className="font-medium">{formatDate(metadata.createdAt)}</p>
                  </div>
                )}
                {metadata.updatedAt && (
                  <div>
                    <span className="text-gray-500">Last Updated</span>
                    <p className="font-medium">{formatDate(metadata.updatedAt)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );

  return (
    <div className={cn('space-y-6', className)} data-testid="detail-page-template">
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        badge={badge}
        breadcrumbs={breadcrumbs}
        showBackButton={showBackButton}
        onBack={onBack}
        primaryAction={primaryAction}
        secondaryActions={variant !== 'sidebar' ? allSecondaryActions : []}
      />

      {/* Error State */}
      {error && (
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {typeof error === 'string' ? error : error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : variant === 'tabs' ? (
        tabContent
      ) : variant === 'sidebar' ? (
        sidebarContent
      ) : (
        infoContent
      )}
    </div>
  );
}

// Preset variants
export const SimpleDetailPage = (props: Omit<DetailPageTemplateProps, 'variant'>) => (
  <DetailPageTemplate {...props} variant="default" />
);

export const TabDetailPage = (props: Omit<DetailPageTemplateProps, 'variant'>) => (
  <DetailPageTemplate {...props} variant="tabs" />
);

export const SidebarDetailPage = (props: Omit<DetailPageTemplateProps, 'variant'>) => (
  <DetailPageTemplate {...props} variant="sidebar" />
);