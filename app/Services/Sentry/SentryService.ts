import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface SentryConfig {
  dsn: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  replaysSessionSampleRate?: number;
}

let isInitialized = false;

export function initSentry(config: SentryConfig): void {
  if (isInitialized || !config.dsn) {
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment || process.env.NODE_ENV,
    release: config.release,
    integrations: [
      new BrowserTracing({
        tracingOrigins: ['localhost', /^\//],
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: config.tracesSampleRate || 0.1,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate || 1.0,
    replaysSessionSampleRate: config.replaysSessionSampleRate || 0.1,
    beforeSend(event) {
      // Filter out development errors
      if (process.env.NODE_ENV === 'development') {
        return null;
      }
      return event;
    },
    beforeSendTransaction(transaction) {
      // Filter out health check transactions
      if (transaction.request?.url?.includes('/health') || transaction.request?.url?.includes('/up')) {
        return null;
      }
      return transaction;
    },
  });

  isInitialized = true;
}

/**
 * React hook to initialize Sentry for the current user session
 */
export function useSentry(): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Sentry) {
      Sentry.setTag('locale', i18n.language);
    }
  }, [i18n.language]);
}

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: Record<string, any>): string {
  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message with level
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): string {
  return Sentry.captureMessage(message, level, {
    extra: context,
  });
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(user: { id: string; email?: string; username?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): Sentry.Transaction | undefined {
  return Sentry.startTransaction({ name, op });
}

/**
 * Wrap a function with error boundary
 */
export function withSentry<P extends object>(
  Component: React.ComponentType<any>,
  errorBoundaryProps?: { fallback?: React.ReactNode }
): React.ComponentType<P> {
  return Sentry.withProfiler(Component, errorBoundaryProps?.fallback);
}

/**
 * Flush pending events (useful on page unload)
 */
export function flushSentry(): Promise<boolean> {
  return Sentry.flush(2000);
}