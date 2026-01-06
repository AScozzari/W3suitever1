import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 [Brand Interface] ErrorBoundary caught error:', error);
    console.error('🚨 [Brand Interface] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '1.25rem', 
          background: '#fee', 
          border: '1px solid #fcc',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          overflow: 'auto',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ color: 'red' }}>🚨 Brand Interface Error</h1>
          <h2>Error: {this.state.error?.message}</h2>
          <pre style={{ background: '#fff', padding: '0.625rem', overflow: 'auto' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}