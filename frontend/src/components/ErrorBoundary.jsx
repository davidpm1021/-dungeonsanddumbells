import { Component } from 'react';
import analytics from '../services/analytics';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child components and displays fallback UI
 * Also reports errors to analytics
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to analytics
    analytics.trackError(error, {
      componentStack: errorInfo.componentStack,
      boundary: this.props.name || 'unknown',
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry,
        });
      }

      // Default fallback UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {this.props.message || 'An unexpected error occurred. Please try again.'}
            </p>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <details className="text-left text-xs text-gray-500 mb-4">
                <summary className="cursor-pointer hover:text-gray-400">
                  Error details
                </summary>
                <pre className="mt-2 p-2 bg-black/30 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 hover:bg-amber-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
