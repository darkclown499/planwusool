import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { t } from '@/utils/i18n';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global React error boundary. Catches render/lifecycle exceptions from the
 * subtree so a runtime crash shows a friendly fallback page with a reload
 * action instead of a blank white window (White Screen of Death).
 * A custom `fallback` node can be supplied to override the default page.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="mt-4 text-lg font-bold text-foreground">{t('Something went wrong')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('An unexpected error stopped this page from loading. Please reload to continue.')}
            </p>
            {this.state.error && (
              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-start">
                <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground" dir="ltr">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            <Button className="mt-6" onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4 me-2" />
              {t('Reload')}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;