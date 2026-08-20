/**
 * Sentry bootstrap — wraps @sentry/react so the app never hard-fails when
 * Sentry is misconfigured or unavailable. All exports keep the original API.
 */
import * as Sentry from '@sentry/react';

export function initSentry(dsn?: string, options?: Record<string, unknown>): void {
  if (!dsn) return;
  try {
    Sentry.init({
      dsn,
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      ...(options || {}),
    });
  } catch (e) {
    console.warn('Sentry init skipped:', e);
  }
}

export function useSentry(): { captureException: (e: unknown) => void; captureMessage: (m: string) => void } {
  return {
    captureException: (e: unknown) => captureException(e),
    captureMessage: (m: string) => captureMessage(m),
  };
}

export function captureException(error: unknown, context?: Record<string, unknown>): string | undefined {
  try {
    return Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    return undefined;
  }
}

export function captureMessage(message: string, level?: 'info' | 'warning' | 'error'): string | undefined {
  try {
    return Sentry.captureMessage(message, level as Sentry.SeverityLevel);
  } catch {
    return undefined;
  }
}

export function setSentryUser(user: { id?: string | number; email?: string } | null): void {
  try {
    if (user) {
      Sentry.setUser({ id: String(user.id ?? ''), email: user.email || '' });
    } else {
      Sentry.setUser(null);
    }
  } catch {
    /* noop */
  }
}

export function addBreadcrumb(breadcrumb: { message?: string; category?: string; level?: string; data?: Record<string, unknown> }): void {
  try {
    Sentry.addBreadcrumb(breadcrumb as Sentry.Breadcrumb);
  } catch {
    /* noop */
  }
}

export function startTransaction(name: string, op?: string): {
  finish: () => void;
  setData: (k: string, v: unknown) => void;
  setTag: (k: string, v: string) => void;
} | null {
  try {
    const span = Sentry.startInactiveSpan({ name, op });
    return {
      finish: () => span?.end(),
      setData: (k: string, v: unknown) => span?.setAttribute(k, v as string),
      setTag: (k: string, v: string) => span?.setAttribute(k, v),
    };
  } catch {
    return null;
  }
}

export function flushSentry(timeout?: number): Promise<boolean> {
  try {
    return Sentry.flush(timeout || 2000);
  } catch {
    return Promise.resolve(false);
  }
}