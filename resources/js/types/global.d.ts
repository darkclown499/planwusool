import type { route as routeFn } from 'ziggy-js';

declare global {
    const route: typeof routeFn;

    interface Window {
        // Global fallback for t() set in app.tsx: returns the key when i18next
        // is not initialized yet, otherwise the i18next translation result.
        t: (key: string, options?: Record<string, unknown>) => string | object;
    }
}
