import { Component, ReactNode, Suspense } from 'react';
import { ErrorState } from '../components/blocks/ErrorState';
import { LoadingState } from '../components/blocks/LoadingState';
import { cn } from '../lib/utils';
import * as React from 'react';

interface ErrorInfo {
  componentStack: string;
}

interface SafePageShellState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface SafePageShellProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

// Error Boundary Class Component
class ErrorBoundary extends Component<SafePageShellProps, SafePageShellState> {
  constructor(props: SafePageShellProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SafePageShellState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SafePageShell caught error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      return (
        <ErrorState
          title="Something went wrong"
          message="An unexpected error occurred while rendering this page."
          error={this.state.error}
          variant="full"
          onRetry={this.handleReset}
          onGoHome={this.handleGoHome}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}

// Suspense Wrapper Component
function SuspenseWrapper({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback || <LoadingState variant="spinner" message="Loading page..." />}>
      {children}
    </Suspense>
  );
}

// Main SafePageShell Component
export function SafePageShell({
  children,
  fallback,
  onError,
  className = '',
}: SafePageShellProps) {
  return (
    <div className={cn('min-h-screen', className)} data-testid="safe-page-shell">
      <ErrorBoundary fallback={fallback} onError={onError}>
        <SuspenseWrapper fallback={fallback}>
          {children}
        </SuspenseWrapper>
      </ErrorBoundary>
    </div>
  );
}

// Higher-order component for wrapping pages
export function withSafePageShell<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<SafePageShellProps, 'children'>
) {
  return (props: P) => (
    <SafePageShell {...options}>
      <Component {...props} />
    </SafePageShell>
  );
}

// Hook for error handling within SafePageShell context
export function useErrorHandler() {
  const handleError = (error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    // Could integrate with error reporting service
    throw error; // Re-throw to be caught by ErrorBoundary
  };

  return { handleError };
}