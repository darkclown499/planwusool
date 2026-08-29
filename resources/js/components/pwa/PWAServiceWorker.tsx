import { useEffect, useRef } from 'react';

interface PWAServiceWorkerProps {
  store: {
    pwa: {
      sw_url: string;
      manifest_url: string;
    };
  };
}

// Guard: do not auto-reload while a critical checkout/payment flow is in flight.
function isCriticalFlowActive(): boolean {
  try {
    const url = window.location.href;
    // URL-based signals (storefront checkout/order routes)
    if (/(checkout|order\/place|payment|paypal|stripe|order-confirmation)/i.test(url)) return true;
    // DOM signals: checkout drawer/modal open or form submitting
    if (document.querySelector('[data-checkout-active="true"]')) return true;
    if (document.querySelector('[data-order-submitting="true"]')) return true;
    // Heuristic: any form with submitting state
    const active = document.activeElement as HTMLElement | null;
    if (active && active.getAttribute('aria-busy') === 'true') return true;
  } catch {}
  return false;
}

export default function PWAServiceWorker({ store }: PWAServiceWorkerProps) {
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const reloadedRef = useRef(false);

  useEffect(() => {
    if (!store?.pwa?.sw_url || !('serviceWorker' in navigator)) return;

    let intervalId: number | undefined;
    let criteriaTimeout1: ReturnType<typeof setTimeout>;
    let criteriaTimeout2: ReturnType<typeof setTimeout>;

    const safeReload = () => {
      if (reloadedRef.current) return;
      if (isCriticalFlowActive()) {
        // Retry shortly; do not interrupt checkout/payment.
        window.setTimeout(safeReload, 3000);
        return;
      }
      reloadedRef.current = true;
      try {
        window.location.reload();
      } catch {}
    };

    const handleControllerChange = () => {
      // New SW has taken control — reload once if not in critical flow.
      // Debounce to avoid double reloads.
      window.clearTimeout(criteriaTimeout1 as unknown as number);
      criteriaTimeout1 = setTimeout(() => {
        if (!window.sessionStorage.getItem('pwa-reload-attempted')) {
          window.sessionStorage.setItem('pwa-reload-attempted', 'true');
        }
        safeReload();
      }, 500);
    };

    const checkPWACriteria = () => {
      const hasController = !!navigator.serviceWorker.controller;
      if (!hasController && !window.sessionStorage.getItem('pwa-reload-attempted')) {
        window.sessionStorage.setItem('pwa-reload-attempted', 'true');
        setTimeout(safeReload, 1000);
      }
    };

    const promptUpdate = (worker: ServiceWorker) => {
      waitingWorkerRef.current = worker;
      // Prefer toast if available, otherwise use lightweight custom event consumers can listen to.
      try {
        // Dispatch event for app to show "new version available" toast if it wishes.
        window.dispatchEvent(new CustomEvent('wusool:pwa-update-available', { detail: { worker } }));
        // If sonner/toast is present, try to show without hard import cycle.
        const w = window as unknown as { toast?: { info?: (msg: string, opts?: unknown) => void } };
        // Do NOT auto-reload immediately — let user finish checkout; auto-reload only if idle.
        // Auto-activates when user navigates or after idle delay outside critical flow.
        if (isCriticalFlowActive()) return;
        // Ask waiting worker to activate; controllerchange will handle reload.
        worker.postMessage({ action: 'skipWaiting' });
      } catch {
        worker.postMessage({ action: 'skipWaiting' });
      }
    };

    // Listen for controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker
      .register(store.pwa.sw_url)
      .then((registration) => {
        // Detect waiting SW already present at register time
        if (registration.waiting) {
          promptUpdate(registration.waiting);
        }

        // Track future updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version installed and old controller still active → prompt/activate safely
              promptUpdate(newWorker);
            }
          });
        });

        // First-install case: no controller yet — claim flow via sessionStorage guard
        if (registration.active && !navigator.serviceWorker.controller) {
          registration.active.postMessage({ action: 'skipWaiting' });
        } else {
          criteriaTimeout1 = setTimeout(checkPWACriteria, 500);
        }

        // Periodic update check (every 15 min) without spamming network
        try {
          intervalId = window.setInterval(
            () => {
              registration.update().catch(() => {});
            },
            15 * 60 * 1000,
          );
        } catch {}

        return navigator.serviceWorker.ready;
      })
      .then(() => {
        criteriaTimeout2 = setTimeout(checkPWACriteria, 1000);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });

    // Allow manual trigger from toast button: window.dispatchEvent(new CustomEvent('wusool:pwa-apply-update'))
    const manualApply = () => {
      const w = waitingWorkerRef.current;
      if (w) w.postMessage({ action: 'skipWaiting' });
      else safeReload();
    };
    window.addEventListener('wusool:pwa-apply-update', manualApply as EventListener);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('wusool:pwa-apply-update', manualApply as EventListener);
      if (intervalId) window.clearInterval(intervalId);
      if (criteriaTimeout1) clearTimeout(criteriaTimeout1 as unknown as number);
      if (criteriaTimeout2) clearTimeout(criteriaTimeout2 as unknown as number);
    };
  }, [store?.pwa?.sw_url]);

  return null;
}