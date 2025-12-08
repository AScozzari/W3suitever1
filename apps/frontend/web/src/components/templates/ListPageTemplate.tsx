// ListPageTemplate - Local template component for list/table pages
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface Column<T = any> {
  key: string;
  header: string;
  accessor?: string | ((item: T) => any);
  render?: (value: any, item: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

interface ListPageTemplateProps<T = any> {
  title: string;
  description?: string;
  data?: T[];
  columns?: Column<T>[];
  loading?: boolean;
  filters?: ReactNode;
  actions?: ReactNode;
  emptyState?: ReactNode;
  className?: string;
  tableClassName?: string;
  onRowClick?: (item: T) => void;
}

export const ListPageTemplate = <T extends Record<string, any>>({
  title,
  description,
  data = [],
  columns = [],
  loading = false,
  filters,
  actions,
  emptyState,
  className,
  tableClassName,
  onRowClick
}: ListPageTemplateProps<T>) => {
  const getValue = (item: T, column: Column<T>) => {
    if (column.accessor) {
      if (typeof column.accessor === 'function') {
        return column.accessor(item);
      }
      return item[column.accessor];
    }
    return item[column.key];
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filters}
          {actions}
        </div>
      </div>

      {/* Data Table */}
      <Card className="backdrop-blur-sm bg-background/50 border-border/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center">
              {emptyState || (
                <div className="text-muted-foreground">
                  <p className="text-lg font-medium">Nessun dato disponibile</p>
                  <p className="text-sm mt-2">Prova a modificare i filtri o aggiungi nuovi elementi</p>
                </div>
              )}
            </div>
          ) : (
            <Table className={tableClassName}>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead 
                      key={column.key}
                      className={column.className}
                    >
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <TableRow 
                    key={item.id || index}
                    onClick={() => onRowClick?.(item)}
                    className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  >
                    {columns.map((column) => (
                      <TableCell 
                        key={column.key}
                        className={column.className}
                      >
                        {column.render 
                          ? column.render(getValue(item, column), item)
                          : getValue(item, column)
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};