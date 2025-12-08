import { useState } from 'react';
import { PageHeader, PageHeaderProps } from '../components/blocks/PageHeader';
import { DataTable, Column } from '../components/blocks/DataTable';
import { SearchBar } from '../components/patterns/SearchBar';
import { ActionBar, Action, ActionGroup } from '../components/patterns/ActionBar';
import { EmptyState } from '../components/blocks/EmptyState';
import { ErrorState } from '../components/blocks/ErrorState';
import { LoadingState } from '../components/blocks/LoadingState';
import { Card } from '../components/ui/card';
import { cn } from '../lib/utils';

export interface ListPageTemplateProps {
  // Page Header
  title: string;
  subtitle?: string;
  breadcrumbs?: PageHeaderProps['breadcrumbs'];
  primaryAction?: PageHeaderProps['primaryAction'];
  
  // Data Table
  data: any[];
  columns: Column[];
  
  // Search & Filters
  searchable?: boolean;
  searchPlaceholder?: string;
  filters?: any[];
  
  // Actions
  bulkActions?: Action[];
  itemActions?: (item: any) => Action[];
  
  // States
  isLoading?: boolean;
  error?: Error | null;
  emptyStateProps?: {
    title: string;
    description?: string;
    icon?: any;
    primaryAction?: any;
  };
  
  // Layout
  variant?: 'default' | 'compact' | 'card';
  className?: string;
}

export function ListPageTemplate({
  title,
  subtitle,
  breadcrumbs,
  primaryAction,
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  filters = [],
  bulkActions = [],
  itemActions,
  isLoading = false,
  error = null,
  emptyStateProps,
  variant = 'default',
  className = '',
}: ListPageTemplateProps) {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // Add selection column if bulk actions exist
  const tableColumns = [...columns];
  if (bulkActions.length > 0) {
    tableColumns.unshift({
      key: '__select',
      label: '',
      width: '40px',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedItems.some((item) => item.id === row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedItems([...selectedItems, row]);
            } else {
              setSelectedItems(selectedItems.filter((item) => item.id !== row.id));
            }
          }}
          data-testid={`checkbox-select-${row.id}`}
        />
      ),
    });
  }

  // Add actions column if item actions exist
  if (itemActions) {
    tableColumns.push({
      key: '__actions',
      label: 'Actions',
      width: '100px',
      render: (_, row) => {
        const actions = itemActions(row);
        return (
          <div className="flex gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className="text-sm text-primary hover:underline"
                data-testid={`button-action-${action.id}-${row.id}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        );
      },
    });
  }

  const getContainerStyles = () => {
    switch (variant) {
      case 'compact':
        return 'space-y-4';
      case 'card':
        return 'space-y-6';
      default:
        return 'space-y-6';
    }
  };

  const content = (
    <>
      {/* Action Bar */}
      {(bulkActions.length > 0 || filters.length > 0) && (
        <ActionBar
          actions={bulkActions}
          selectedCount={selectedItems.length}
          onClearSelection={() => setSelectedItems([])}
          variant={variant === 'compact' ? 'compact' : 'default'}
        />
      )}

      {/* Search Bar */}
      {searchable && (
        <SearchBar
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={setSearchTerm}
          filters={filters}
          onFilterChange={setActiveFilters}
          variant={variant === 'compact' ? 'minimal' : 'default'}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingState variant="table" />
      ) : error ? (
        <ErrorState
          title="Error loading data"
          message={error.message}
          error={error}
          variant="card"
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={emptyStateProps?.title || 'No items found'}
          description={emptyStateProps?.description}
          icon={emptyStateProps?.icon}
          primaryAction={emptyStateProps?.primaryAction}
        />
      ) : (
        <DataTable
          data={data || []}
          columns={tableColumns}
          searchable={false} // We handle search externally
          paginated={true}
          loading={isLoading}
          error={error}
        />
      )}
    </>
  );

  return (
    <div className={cn(getContainerStyles(), className)} data-testid="list-page-template">
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        primaryAction={primaryAction}
      />

      {/* Content */}
      {variant === 'card' ? (
        <Card className="p-6">{content}</Card>
      ) : (
        content
      )}
    </div>
  );
}