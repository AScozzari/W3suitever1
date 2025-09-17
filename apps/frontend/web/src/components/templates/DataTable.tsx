// DataTable - A simple data table component
import { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<T = any> {
  key: string;
  header: string;
  accessor?: string | ((item: T) => any);
  render?: (value: any, item: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
}

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onRowClick,
  className,
  emptyMessage = "Nessun dato disponibile"
}: DataTableProps<T>) => {
  const getValue = (item: T, column: Column<T>) => {
    if (column.accessor) {
      if (typeof column.accessor === 'function') {
        return column.accessor(item);
      }
      return item[column.accessor];
    }
    return item[column.key];
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
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
              <TableCell key={column.key} className={column.className}>
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
  );
};