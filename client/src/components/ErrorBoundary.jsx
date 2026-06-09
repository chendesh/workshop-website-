import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-slate-800 border border-red-500/30 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-slate-300 mb-4">The application encountered an error:</p>
            <pre className="bg-slate-900 rounded-lg p-4 text-red-300 text-sm overflow-x-auto mb-4 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
            {this.state.errorInfo && (
              <details className="text-slate-400 text-xs">
                <summary className="cursor-pointer text-slate-300 mb-2">Component Stack</summary>
                <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-amber-500 hover:bg-amber-600 text-slate-900 px-6 py-2 rounded-lg font-medium"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
