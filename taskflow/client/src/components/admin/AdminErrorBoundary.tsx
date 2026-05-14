import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AdminErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Something went wrong</h3>
            <p className="text-sm text-gray-500 mt-1.5 max-w-md leading-relaxed">
              {this.state.error.message || 'An unexpected error occurred in this section.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-5 py-2.5 text-sm font-semibold bg-primary-700 hover:bg-primary-800 text-white rounded-xl transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
