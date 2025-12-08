import { Skeleton } from '../ui/skeleton';
import { Card } from '../ui/card';
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'card' | 'table' | 'list' | 'grid';
  message?: string;
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingState({
  variant = 'spinner',
  message = 'Loading...',
  rows = 5,
  columns = 4,
  className = '',
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center space-y-4 p-8',
          className
        )}
        data-testid="loading-spinner"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {message && (
          <p className="text-sm text-gray-600" data-testid="loading-message">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-4', className)} data-testid="loading-skeleton">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn('p-6', className)} data-testid="loading-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-24 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      </Card>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-4', className)} data-testid="loading-table">
        <div className="rounded-md border">
          <div className="border-b bg-gray-50 p-4">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
          </div>
          <div className="divide-y">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex gap-4 p-4">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <Skeleton
                    key={colIndex}
                    className="h-4 flex-1"
                    style={{
                      animationDelay: `${(rowIndex + colIndex) * 50}ms`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)} data-testid="loading-list">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          className
        )}
        data-testid="loading-grid"
      >
        {Array.from({ length: rows * 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-40 w-full rounded" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex justify-between">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return null;
}

// Preset loading states for common use cases
export const PageLoadingState = () => (
  <div className="space-y-6">
    <LoadingState variant="skeleton" />
    <LoadingState variant="table" />
  </div>
);

export const CardGridLoadingState = () => (
  <LoadingState variant="grid" rows={2} />
);

export const TableLoadingState = () => (
  <LoadingState variant="table" rows={10} columns={5} />
);

export const FullPageLoadingState = ({ message }: { message?: string }) => (
  <div className="flex h-screen items-center justify-center">
    <LoadingState variant="spinner" message={message} />
  </div>
);

// Loading wrapper component
export function WithLoading({
  isLoading,
  loadingComponent,
  children,
}: {
  isLoading: boolean;
  loadingComponent?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return <>{loadingComponent || <LoadingState variant="spinner" />}</>;
  }

  return <>{children}</>;
}