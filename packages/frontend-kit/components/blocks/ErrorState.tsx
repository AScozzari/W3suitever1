import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import * as React from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Home,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  title?: string;
  message: string;
  error?: Error | unknown;
  variant?: 'inline' | 'card' | 'full';
  severity?: 'warning' | 'error';
  showDetails?: boolean;
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'An error occurred',
  message,
  error,
  variant = 'inline',
  severity = 'error',
  showDetails = true,
  onRetry,
  onGoHome,
  className = '',
}: ErrorStateProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const getIcon = () => {
    return severity === 'warning' ? (
      <AlertTriangle className="h-5 w-5" />
    ) : (
      <XCircle className="h-5 w-5" />
    );
  };

  const getErrorDetails = () => {
    if (!error) return null;
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    
    return {
      details: JSON.stringify(error, null, 2),
    };
  };

  const errorDetails = getErrorDetails();

  if (variant === 'inline') {
    return (
      <Alert
        variant={severity === 'warning' ? 'default' : 'destructive'}
        className={cn('', className)}
        data-testid="error-state-inline"
      >
        {getIcon()}
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{message}</p>
          
          {showDetails && errorDetails && (
            <div className="mt-2">
              <button
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="flex items-center gap-1 text-sm font-medium hover:underline"
                data-testid="button-toggle-details"
              >
                {detailsExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Technical Details
              </button>
              
              {detailsExpanded && (
                <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs">
                  {errorDetails.stack || JSON.stringify(errorDetails, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {(onRetry || onGoHome) && (
            <div className="flex gap-2">
              {onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  data-testid="button-retry"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Retry
                </Button>
              )}
              {onGoHome && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onGoHome}
                  data-testid="button-home"
                >
                  <Home className="mr-2 h-3 w-3" />
                  Go Home
                </Button>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'card') {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)} data-testid="error-state-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            {getIcon()}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-700">
          <p>{message}</p>
          
          {showDetails && errorDetails && (
            <div className="mt-4">
              <button
                onClick={() => setDetailsExpanded(!detailsExpanded)}
                className="flex items-center gap-1 text-sm font-medium text-red-800 hover:underline"
                data-testid="button-toggle-details"
              >
                {detailsExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Technical Details
              </button>
              
              {detailsExpanded && (
                <pre className="mt-2 max-h-60 overflow-auto rounded bg-white/50 p-3 text-xs">
                  {errorDetails.stack || JSON.stringify(errorDetails, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
        {(onRetry || onGoHome) && (
          <CardFooter className="flex gap-2">
            {onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                className="border-red-300 text-red-700 hover:bg-red-100"
                data-testid="button-retry"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
            {onGoHome && (
              <Button
                variant="outline"
                onClick={onGoHome}
                className="border-red-300 text-red-700 hover:bg-red-100"
                data-testid="button-home"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    );
  }

  // Full page error
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center space-y-4 p-8 text-center',
        className
      )}
      data-testid="error-state-full"
    >
      <div
        className={cn(
          'rounded-full p-4',
          severity === 'warning' ? 'bg-amber-100' : 'bg-red-100'
        )}
      >
        {severity === 'warning' ? (
          <AlertTriangle className="h-12 w-12 text-amber-600" />
        ) : (
          <XCircle className="h-12 w-12 text-red-600" />
        )}
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600">{message}</p>
      </div>

      {showDetails && errorDetails && (
        <div className="w-full max-w-md">
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:underline"
            data-testid="button-toggle-details"
          >
            {detailsExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            Technical Details
          </button>
          
          {detailsExpanded && (
            <pre className="mt-2 max-h-60 overflow-auto rounded border bg-gray-50 p-4 text-left text-xs">
              {errorDetails.stack || JSON.stringify(errorDetails, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {onRetry && (
          <Button onClick={onRetry} data-testid="button-retry">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
        {onGoHome && (
          <Button variant="outline" onClick={onGoHome} data-testid="button-home">
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}

// Error Boundary Component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback;
      if (Fallback) {
        return <Fallback error={this.state.error!} />;
      }

      return (
        <ErrorState
          title="Application Error"
          message="An unexpected error occurred in the application."
          error={this.state.error}
          variant="full"
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}